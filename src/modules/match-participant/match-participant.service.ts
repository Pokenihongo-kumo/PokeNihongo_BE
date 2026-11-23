import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { MatchRoundNumber, MatchStatus } from '@/common/constants/match.constant'
import { MatchingSocketMessage } from '@/i18n/message-keys'
import { MatchRoundParticipantService } from '@/modules/match-round-participant/match-round-participant.service'
import { MatchRoundService } from '@/modules/match-round/match-round.service'
import { MatchService } from '@/modules/match/match.service'
import { NotFoundRecordException } from '@/shared/error'
import {
  addTimeUTC,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { Queue } from 'bull'
import { MatchingGateway } from '@/websockets/matching.gateway'
import {
  MatchParticipantInvalidActionException,
  MatchParticipantNotFoundException
} from './dto/match-participant.error'
import {
  CreateMatchParticipantBody,
  UpdateMatchParticipantBody
} from './dto/match-participant.zod-dto'
import { MatchParticipantRepo } from './match-participant.repo'

const TIME_CHOOSE_POKEMON_MS = 5000
@Injectable()
export class MatchParticipantService {
  private readonly logger = new Logger(MatchParticipantService.name)

  constructor(
    private matchParticipantRepo: MatchParticipantRepo,
    private readonly matchService: MatchService,
    private readonly matchRoundService: MatchRoundService,
    private readonly matchRoundParticipantService: MatchRoundParticipantService,
    @InjectQueue(BullQueue.MATCH_PARTICIPANT_TIMEOUT)
    private readonly matchParticipantTimeoutQueue: Queue,
    @InjectQueue(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
    private readonly matchRoundParticipantTimeoutQueue: Queue,
    private readonly matchingGateway: MatchingGateway
  ) {}

  async list(pagination: PaginationQuery) {
    const data = await this.matchParticipantRepo.list(pagination)
    return data
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number) {
    const matchParticipant = await this.matchParticipantRepo.findById(id)
    if (!matchParticipant) {
      throw new MatchParticipantNotFoundException()
    }

    return matchParticipant
  }

  async create({ userId, data }: { userId: number; data: CreateMatchParticipantBody }) {
    try {
      // check coi co truyen userId ko, neu ko thi lay cua created_by
      data.userId = data.userId || userId

      const result = await this.matchParticipantRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return result
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async update({
    id,
    data,
    userId
  }: {
    id: number
    data: UpdateMatchParticipantBody
    userId?: number
  }) {
    try {
      //check coi thang user nay co
      const existingParticipant = await this.matchParticipantRepo.findById(id)
      if (!existingParticipant) {
        throw new MatchParticipantNotFoundException()
      }
      // Only the player's own place: another player's answers like a missing
      // one (anyone could accept or decline for someone else)
      if (existingParticipant.userId !== userId) {
        throw new MatchParticipantNotFoundException()
      }
      if (existingParticipant.hasAccepted !== null) {
        throw new MatchParticipantInvalidActionException()
      }
      data.hasAccepted = data.hasAccepted ? data.hasAccepted : false

      const matchParticipant = await this.matchParticipantRepo.update({
        id,
        data: data,
        updatedById: userId
      })

      // User đã đưa ra quyết định thủ công -> xóa Bull job timeout tương ứng (nếu còn)
      await this.removeBullJobForParticipant(
        existingParticipant.id,
        existingParticipant.userId
      )
      this.logger.debug(
        `[MatchParticipant] Removed acceptance timeout job after manual update for participant ${existingParticipant.id}`
      )

      // Nếu user đã quyết định (accept hoặc reject, hasAccepted !== null)
      if (data.hasAccepted !== null && data.hasAccepted !== undefined) {
        // Kiểm tra xem cả 2 participants đã quyết định chưa
        await this.checkBothParticipantsAccepted(existingParticipant.matchId)
      }

      return matchParticipant
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new MatchParticipantNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  /**
   * Kiểm tra xem cả 2 participants của match đã accept chưa
   * Logic:
   * - Nếu tất cả participants có hasAccepted !== null (đã quyết định):
   *   - Nếu CẢ 2 accept (true) → Match IN_PROGRESS, notify success
   *   - Nếu CÓ 1 reject (false) → Match CANCELLED, notify failed
   */
  private async checkBothParticipantsAccepted(matchId: number): Promise<void> {
    try {
      // Lấy tất cả participants của match này
      const participants = await this.matchParticipantRepo.findByMatchId(matchId)

      if (participants.length !== 2) {
        this.logger.warn(
          `[MatchParticipant] Match ${matchId} has ${participants.length} participants (expected 2)`
        )
        return
      }

      // Kiểm tra xem TẤT CẢ participants đã quyết định chưa (hasAccepted !== null)
      const allDecided = participants.every((p) => p.hasAccepted !== null)

      if (!allDecided) {
        this.logger.debug(
          `[MatchParticipant] Match ${matchId} waiting for all players to decide (accept/reject)`
        )
        return
      }

      // Tất cả đã quyết định → xóa tất cả Bull jobs cho match này
      await this.removeAllBullJobsForMatch(matchId, participants)

      // Kiểm tra xem có ai reject không
      const hasRejection = participants.some((p) => p.hasAccepted === false)
      const userIds = participants.map((p) => p.userId)

      if (hasRejection) {
        // Có người reject → CANCELLED
        this.logger.log(
          `[MatchParticipant] Match ${matchId} has rejection - cancelling match`
        )

        const updateMatch = await this.matchService.updateMatch({
          id: matchId,
          data: {
            status: MatchStatus.CANCELLED
          }
        })

        // Gửi WebSocket notification - Match cancelled
        this.matchingGateway.notifyMatchStatusUpdate(
          userIds,
          matchId,
          updateMatch.status,
          MatchingSocketMessage.HAVE_PLAYER_CANCELLED
        )
      } else {
        // Cả 2 accept → IN_PROGRESS
        this.logger.log(
          `[MatchParticipant] Both participants accepted match ${matchId} - match is ready`
        )

        const updateMatch = await this.matchService.updateMatch({
          id: matchId,
          data: {
            status: MatchStatus.IN_PROGRESS
          }
        })

        // Tạo 3 rounds cho match
        await this.createMatchRounds(matchId, participants)

        // Gửi WebSocket notification - Match ready
        this.matchingGateway.notifyMatchStatusUpdate(
          userIds,
          matchId,
          updateMatch.status,
          MatchingSocketMessage.MATCH_READY_START
        )
      }
    } catch (error) {
      this.logger.error(
        `[MatchParticipant] Error checking participants for match ${matchId}: ${error.message}`,
        error.stack
      )
      // Don't throw - this is not critical
    }
  }

  /**
   * Tạo 3 match rounds cho match
   */
  private async createMatchRounds(
    matchId: number,
    matchParticipants: any[]
  ): Promise<void> {
    try {
      this.logger.log(`[MatchParticipant] Creating 3 rounds for match ${matchId}`)

      // Random order cho round ONE
      const shuffledParticipants = [...matchParticipants].sort(() => Math.random() - 0.5)

      // Tạo 3 rounds: ONE, TWO, THREE
      const roundNumbers = [
        MatchRoundNumber.ONE,
        MatchRoundNumber.TWO,
        MatchRoundNumber.THREE
      ]

      await this.matchParticipantRepo.withTransaction(async (prismaTx) => {
        let previousOrderMapping: Map<number, number> = new Map() // matchParticipantId -> orderSelected

        for (let roundIndex = 0; roundIndex < roundNumbers.length; roundIndex++) {
          const roundNumber = roundNumbers[roundIndex]

          // Tạo match-round
          const createdMatchRound = await this.matchRoundService.createRoundRow(
            matchId,
            roundNumber,
            prismaTx
          )

          this.logger.debug(
            `[MatchParticipant] Created match-round ${createdMatchRound.id} for round ${roundNumber}`
          )

          let participantsWithOrder: Array<{
            matchParticipantId: number
            orderSelected: number
            endTimeSelected: Date | null
          }>

          if (roundNumber === MatchRoundNumber.ONE) {
            // Round ONE: Random order
            participantsWithOrder = shuffledParticipants.map((participant, index) => {
              const orderSelected = index + 1
              previousOrderMapping.set(participant.id, orderSelected)

              return {
                matchParticipantId: participant.id,
                orderSelected,
                endTimeSelected: null // Chỉ set sau khi tạo xong tất cả rounds
              }
            })
          } else {
            // Round TWO/THREE: Đảo ngược thứ tự
            const maxOrderFromPrevious = Math.max(...previousOrderMapping.values())

            // Sắp xếp theo order giảm dần (người có order cao → chọn trước)
            const sortedParticipants = [...matchParticipants].sort((a, b) => {
              const orderA = previousOrderMapping.get(a.id) || 0
              const orderB = previousOrderMapping.get(b.id) || 0
              return orderB - orderA
            })

            participantsWithOrder = sortedParticipants.map((participant, index) => {
              const newOrder = maxOrderFromPrevious + 1 + index
              previousOrderMapping.set(participant.id, newOrder)

              return {
                matchParticipantId: participant.id,
                orderSelected: newOrder,
                endTimeSelected: null
              }
            })
          }

          // Tạo match-round-participants
          const matchRoundParticipantsData = participantsWithOrder.map((participant) => ({
            matchRoundId: createdMatchRound.id,
            matchParticipantId: participant.matchParticipantId,
            selectedUserPokemonId: null,
            orderSelected: participant.orderSelected,
            endTimeSelected: participant.endTimeSelected
          }))

          await this.matchRoundService.createParticipants(
            matchRoundParticipantsData,
            prismaTx
          )

          this.logger.debug(
            `[MatchParticipant] Created ${matchRoundParticipantsData.length} participants for round ${roundNumber}`
          )
        }
      })

      // Sau khi tạo xong tất cả rounds, set endTime và Bull job cho người đầu tiên của Round ONE
      const roundOne = await this.matchRoundService.findByMatchIdAndRoundNumber(
        matchId,
        MatchRoundNumber.ONE
      )

      if (roundOne) {
        const roundOneParticipants =
          await this.matchRoundParticipantService.findRoundParticipants({
            where: {
              matchRoundId: roundOne.id
            },
            orderBy: {
              orderSelected: 'asc'
            }
          })

        const firstParticipant = roundOneParticipants[0]
        if (firstParticipant) {
          // Set endTimeSelected cho người đầu tiên
          await this.matchRoundParticipantService.updateRoundParticipant({
            id: firstParticipant.id,
            data: {
              endTimeSelected: addTimeUTC(new Date(), TIME_CHOOSE_POKEMON_MS)
            }
          })

          // Tạo Bull job
          const job = await this.matchRoundParticipantTimeoutQueue.add(
            BullAction.CHECK_POKEMON_SELECTION_TIMEOUT,
            {
              matchRoundParticipantId: firstParticipant.id
            },
            {
              delay: TIME_CHOOSE_POKEMON_MS
            }
          )

          // Log job id and current state for diagnostics
          // @ts-ignore
          const state = await job.getState?.()
          this.logger.log(
            `[MatchParticipant] Set endTime and Bull job for first participant of Round ONE (id: ${firstParticipant.id}), jobId=${job.id}, state=${state}`
          )
          this.logger.log(
            `[MatchParticipant] Enqueued CHECK_POKEMON_SELECTION_TIMEOUT for participant ${firstParticipant.id} delay=${TIME_CHOOSE_POKEMON_MS} (jobId=${job.id})`
          )
        }
      }

      this.logger.log(
        `[MatchParticipant] Successfully created 3 rounds for match ${matchId}`
      )
    } catch (error) {
      this.logger.error(
        `[MatchParticipant] Error creating rounds for match ${matchId}: ${error.message}`,
        error.stack
      )
      throw error
    }
  }

  /**
   * Xóa tất cả Bull jobs cho match này
   */
  private async removeAllBullJobsForMatch(
    matchId: number,
    participants: any[]
  ): Promise<void> {
    try {
      const jobs = await this.matchParticipantTimeoutQueue.getJobs([
        'waiting',
        'delayed',
        'active'
      ])

      const participantIds = participants.map((p) => p.id)
      const userIds = participants.map((p) => p.userId)

      const jobsToRemove = jobs.filter(
        (j) =>
          participantIds.includes(j.data?.matchParticipantId) ||
          userIds.includes(j.data?.userId)
      )

      if (jobsToRemove.length > 0) {
        await Promise.all(jobsToRemove.map((job) => job.remove()))
        this.logger.log(
          `[MatchParticipant] Removed ${jobsToRemove.length} Bull jobs for match ${matchId}`
        )
      } else {
        this.logger.debug(`[MatchParticipant] No Bull jobs found for match ${matchId}`)
      }
    } catch (error) {
      this.logger.warn(
        `[MatchParticipant] Failed to remove Bull jobs for match ${matchId}: ${error.message}`
      )
    }
  }

  /**
   * Remove Bull timeout job for a match participant
   * Tìm và xóa job theo jobId pattern: check-acceptance-timeout-{participantId}
   */
  private async removeBullJobForParticipant(
    participantId: number,
    userId: number
  ): Promise<void> {
    try {
      // Get all jobs in the queue
      const jobs = await this.matchParticipantTimeoutQueue.getJobs([
        'waiting',
        'delayed',
        'active'
      ])

      // Find job matching this participant
      const job = jobs.find(
        (j) => j.data?.matchParticipantId === participantId || j.data?.userId === userId
      )

      if (job) {
        await job.remove()
        this.logger.log(
          `[MatchParticipant] Removed Bull job ${job.id} for participant ${participantId}, user ${userId}`
        )
      } else {
        this.logger.debug(
          `[MatchParticipant] No Bull job found for participant ${participantId}, user ${userId} - may have already expired`
        )
      }
    } catch (error) {
      this.logger.warn(
        `[MatchParticipant] Failed to remove Bull job for participant ${participantId}: ${error.message}`
      )
      // Don't throw - this is not critical, job will timeout anyway
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }) {
    try {
      const existMatchParticipant = await this.matchParticipantRepo.findById(id)
      if (!existMatchParticipant) {
        throw new MatchParticipantNotFoundException()
      }

      await this.matchParticipantRepo.delete(id)
      return
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new MatchParticipantNotFoundException()
      }
      throw error
    }
  }

  async getListPokemonByUser(userId: number, lang: string = 'vi') {}

  // ---- For other modules (module-boundary plan B6) ----
  // Same arguments and results as the repo methods.

  // The repo's create (the service's own create answers the HTTP route)
  createParticipant(...args: Parameters<MatchParticipantRepo['create']>) {
    return this.matchParticipantRepo.create(...args)
  }
}
