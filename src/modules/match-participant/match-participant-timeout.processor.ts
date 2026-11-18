import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { MatchStatus, MatchStatusType } from '@/common/constants/match.constant'
import { MatchingSocketMessage } from '@/i18n/message-keys'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  InjectQueue,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueWaiting,
  Process,
  Processor
} from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job, Queue } from 'bull'
import { MatchingGateway } from 'src/websockets/matching.gateway'

interface MatchParticipantTimeoutJobData {
  matchParticipantId: number
  matchId: number
  userId: number
}

@Processor(BullQueue.MATCH_PARTICIPANT_TIMEOUT)
export class MatchParticipantTimeoutProcessor {
  private readonly logger = new Logger(MatchParticipantTimeoutProcessor.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly matchingGateway: MatchingGateway,
    @InjectQueue(BullQueue.MATCH_PARTICIPANT_TIMEOUT)
    private readonly matchParticipantTimeoutQueue: Queue
  ) {}

  // Queue lifecycle diagnostics
  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(
      `[MatchParticipant Timeout] (jobId=${job.id}) active for participant=${job.data?.matchParticipantId}`
    )
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.debug(
      `[MatchParticipant Timeout] (jobId=${job.id}) completed for participant=${job.data?.matchParticipantId}`
    )
  }

  @OnQueueFailed()
  onFailed(job: Job, err: any) {
    this.logger.warn(
      `[MatchParticipant Timeout] (jobId=${job?.id}) failed for participant=${job?.data?.matchParticipantId}: ${err?.message}`
    )
  }

  @OnQueueWaiting()
  onWaiting(jobId: number) {
    this.logger.debug(`[MatchParticipant Timeout] (jobId=${jobId}) waiting`)
  }

  /**
   * Xử lý timeout cho MatchParticipant acceptance
   * Sau 25s, nếu hasAccepted vẫn null → set thành false
   * Sau đó check cả 2 participants để update Match status
   */
  @Process({ name: BullAction.CHECK_ACCEPTANCE_TIMEOUT, concurrency: 10 })
  async handleAcceptanceTimeout(job: Job<MatchParticipantTimeoutJobData>): Promise<void> {
    const { matchParticipantId, matchId, userId } = job.data

    try {
      this.logger.log(
        `[MatchParticipant Timeout] (jobId=${job.id}) start for participant=${matchParticipantId}, user=${userId}, match=${matchId}, delayMs=${job.opts.delay}`
      )

      await this.prisma.$transaction(async (tx) => {
        // 1. Lock all participants of this match to prevent race conditions
        const lockedParticipants = await tx.$queryRaw<
          Array<{ id: number; hasAccepted: boolean | null }>
        >`
          SELECT id, "hasAccepted"
          FROM "MatchParticipant"
          WHERE "matchId" = ${matchId} AND "deletedAt" IS NULL
          FOR UPDATE
        `

        this.logger.debug(
          `[MatchParticipant Timeout] (jobId=${job.id}) Locked participants: ${lockedParticipants
            .map((p) => `id=${p.id},accepted=${p.hasAccepted}`)
            .join(' | ')}`
        )

        // 2. Find the current participant
        const participant = lockedParticipants.find((p) => p.id === matchParticipantId)

        if (!participant) {
          this.logger.warn(
            `[MatchParticipant Timeout] Participant ${matchParticipantId} not found`
          )
          return
        }

        // 3. Nếu hasAccepted vẫn null, set thành false
        let wasUpdated = false
        if (participant.hasAccepted === null) {
          await tx.matchParticipant.update({
            where: { id: matchParticipantId },
            data: { hasAccepted: false }
          })

          this.logger.log(
            `[MatchParticipant Timeout] Set hasAccepted = false for participant ${matchParticipantId}`
          )
          wasUpdated = true
        }

        // 4. Lấy lại tất cả participants sau khi update
        let allParticipants = await tx.matchParticipant.findMany({
          where: { matchId, deletedAt: null }
        })

        this.logger.debug(
          `[MatchParticipant Timeout] (jobId=${job.id}) Snapshot participants${wasUpdated ? ' (after update)' : ''}: ${allParticipants
            .map((p) => `id=${p.id},user=${p.userId},accepted=${p.hasAccepted}`)
            .join(' | ')}`
        )

        // 4. Check nếu tất cả participants đều có hasAccepted !== null
        let allAnswered = allParticipants.every((p) => p.hasAccepted !== null)

        if (!allAnswered) {
          // If the peer's acceptance job is missing, auto-resolve to prevent limbo
          const pending = allParticipants.filter((p) => p.hasAccepted === null)
          if (pending.length === 1) {
            const missingP = pending[0]
            // Check if a job exists for this participant in the queue
            const jobs = await this.matchParticipantTimeoutQueue.getJobs([
              'waiting',
              'delayed',
              'active'
            ])
            const exists = jobs.some((j) => j.data?.matchParticipantId === missingP.id)

            if (!exists) {
              await tx.matchParticipant.update({
                where: { id: missingP.id },
                data: { hasAccepted: false }
              })
              this.logger.warn(
                `[MatchParticipant Timeout] (jobId=${job.id}) Peer job missing; auto-set hasAccepted=false for participant ${missingP.id}`
              )

              // Refresh state
              const refreshed = await tx.matchParticipant.findMany({
                where: { matchId, deletedAt: null }
              })
              allParticipants = refreshed // Update reference
              allAnswered = refreshed.every((p) => p.hasAccepted !== null)

              this.logger.debug(
                `[MatchParticipant Timeout] (jobId=${job.id}) Snapshot after auto-resolve: ${refreshed
                  .map((p) => `id=${p.id},user=${p.userId},accepted=${p.hasAccepted}`)
                  .join(' | ')}`
              )
            }
          }

          if (!allAnswered) {
            this.logger.debug(
              `[MatchParticipant Timeout] (jobId=${job.id}) Not all participants answered yet for match ${matchId}`
            )
            return
          }
        }

        // 5. Determine match status based on acceptance
        const allAccepted = allParticipants.every((p) => p.hasAccepted === true)
        const anyRejected = allParticipants.some((p) => p.hasAccepted === false)

        let newStatus: (typeof MatchStatus)[keyof typeof MatchStatus] | null = null

        if (allAccepted) {
          newStatus = MatchStatus.IN_PROGRESS
          this.logger.log(
            `[MatchParticipant Timeout] All participants accepted match ${matchId} → IN_PROGRESS`
          )
        } else if (anyRejected) {
          newStatus = MatchStatus.CANCELLED
          this.logger.log(
            `[MatchParticipant Timeout] At least one participant rejected match ${matchId} → CANCELLED`
          )
        }

        // 6. Update match status
        if (newStatus) {
          await tx.match.update({
            where: { id: matchId },
            data: { status: newStatus as MatchStatusType }
          })

          this.logger.log(
            `[MatchParticipant Timeout] (jobId=${job.id}) Updated match ${matchId} status to ${newStatus}`
          )

          // 7. Send WebSocket notification to all participants
          const userIds = allParticipants.map((p) => p.userId)
          const message =
            newStatus === MatchStatus.IN_PROGRESS
              ? MatchingSocketMessage.ALL_ACCEPT_MATCH
              : MatchingSocketMessage.HAVE_PLAYER_CANCELLED

          this.matchingGateway.notifyMatchStatusUpdate(
            userIds,
            matchId,
            newStatus,
            message
          )
        }
      })
    } catch (error) {
      this.logger.error(
        `[MatchParticipant Timeout] Error processing timeout for participant ${matchParticipantId}:`,
        error
      )
      throw error
    }
  }
}
