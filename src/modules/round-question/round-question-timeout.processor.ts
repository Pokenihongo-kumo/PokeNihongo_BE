import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { QuestionBankService } from '@/modules/question-bank/question-bank.service'
import { addTimeUTC } from '@/shared/helpers'
import { RoundQuestionRepo } from './round-question.repo'
import { RoundCompletionService } from './round-completion.service'
import { MatchingGateway } from '@/websockets/matching.gateway'
import { SocketServerService } from '@/websockets/socket-server.service'
import {
  InjectQueue,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueWaiting,
  Process,
  Processor
} from '@nestjs/bull'
import { Logger, OnModuleInit } from '@nestjs/common'
import { Job, Queue } from 'bull'

@Processor(BullQueue.ROUND_QUESTION_TIMEOUT)
export class RoundQuestionTimeoutProcessor implements OnModuleInit {
  private readonly logger = new Logger(RoundQuestionTimeoutProcessor.name)

  // Track setTimeout references to allow cancellation when user answers early
  private timeoutRefs = new Map<string, NodeJS.Timeout>()

  constructor(
    private readonly roundQuestionRepo: RoundQuestionRepo,
    private readonly matchingGateway: MatchingGateway,
    private readonly questionBankService: QuestionBankService,
    private readonly socketServerService: SocketServerService,
    @InjectQueue(BullQueue.ROUND_QUESTION_TIMEOUT)
    private readonly roundQuestionTimeoutQueue: Queue,
    private readonly roundCompletion: RoundCompletionService
  ) {}

  /**
   * Clear pending timeout for a specific question
   * Called by service when user answers before timeout
   */
  public clearQuestionTimeout(
    roundQuestionId: number,
    matchRoundParticipantId: number
  ): void {
    const key = `${roundQuestionId}-${matchRoundParticipantId}`
    const timeoutRef = this.timeoutRefs.get(key)

    if (timeoutRef) {
      clearTimeout(timeoutRef)
      this.timeoutRefs.delete(key)
      this.logger.log(
        `[RoundQuestion Timeout] ⏹️ Cleared timeout for roundQuestionId=${roundQuestionId}, participantId=${matchRoundParticipantId}`
      )
    }
  }

  async onModuleInit() {
    this.logger.log('RoundQuestionTimeoutProcessor initialized')
    try {
      await this.roundQuestionTimeoutQueue.isReady()

      // Listen to removed event
      this.roundQuestionTimeoutQueue.on('removed', (job: Job) => {
        this.logger.error(
          `[RoundQuestion Timeout] 🗑️🗑️🗑️ JOB REMOVED: jobId=${job.id}, roundQuestionId=${job.data?.roundQuestionId}, matchRoundParticipantId=${job.data?.matchRoundParticipantId}, state=${job.returnvalue}`
        )
      })

      // Listen to cleaned event
      this.roundQuestionTimeoutQueue.on('cleaned', (jobs: Job[], type: string) => {
        this.logger.error(
          `[RoundQuestion Timeout] 🧹🧹🧹 QUEUE CLEANED: ${jobs.length} jobs of type ${type} removed`
        )
        jobs.forEach((job) => {
          this.logger.error(
            `[RoundQuestion Timeout] 🧹 Cleaned job: jobId=${job.id}, roundQuestionId=${job.data?.roundQuestionId}`
          )
        })
      })

      try {
        await this.roundQuestionTimeoutQueue.resume(true)
        this.logger.log('[RoundQuestion Timeout] Queue resumed (global=true)')
      } catch (e) {
        this.logger.warn('[RoundQuestion Timeout] Queue resume skipped/failed', e as any)
      }
      const counts = await this.roundQuestionTimeoutQueue.getJobCounts()
      this.logger.log(
        `[RoundQuestion Timeout] Queue job counts on init: ${Object.entries(counts)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')}`
      )

      // Periodic check for stuck jobs every 10s
      setInterval(async () => {
        try {
          const counts = await this.roundQuestionTimeoutQueue.getJobCounts()
          if (counts.waiting > 0 || counts.delayed > 0) {
            this.logger.debug(
              `[RoundQuestion Timeout] 🔍 Periodic check: waiting=${counts.waiting}, delayed=${counts.delayed}, active=${counts.active}`
            )

            // Check specific waiting jobs
            if (counts.waiting > 0 && counts.active === 0) {
              const isPaused = await this.roundQuestionTimeoutQueue.isPaused()
              this.logger.error(
                `[RoundQuestion Timeout] 🚨 CRITICAL: Queue has ${counts.waiting} WAITING jobs but NO ACTIVE jobs! isPaused=${isPaused}`
              )

              const waitingJobs = await this.roundQuestionTimeoutQueue.getWaiting()
              this.logger.error(
                `[RoundQuestion Timeout] 🔍 Total waiting jobs: ${waitingJobs.length}`
              )

              for (const job of waitingJobs.slice(0, 5)) {
                const state = await job.getState()
                this.logger.error(
                  `[RoundQuestion Timeout] 🚨 Stuck job: jobId=${job.id}, roundQuestionId=${job.data?.roundQuestionId}, matchRoundParticipantId=${job.data?.matchRoundParticipantId}, state=${state}, attemptsMade=${job.attemptsMade}, timestamp=${job.timestamp}, processedOn=${job.processedOn}`
                )

                // FORCE RETRY: Try to manually moveToCompleted then retry
                if (state === 'waiting' && job.attemptsMade === 0) {
                  try {
                    this.logger.warn(
                      `[RoundQuestion Timeout] 🔧 FORCE RETRYING stuck job ${job.id} by calling retry()...`
                    )
                    await job.retry()
                  } catch (e) {
                    this.logger.error(
                      `[RoundQuestion Timeout] ❌ Failed to retry job ${job.id}: ${e.message}`
                    )
                  }
                }
              }
            }
          }
        } catch (err) {
          // Silent fail
        }
      }, 10000)
    } catch (e) {
      this.logger.error(
        '[RoundQuestion Timeout] Error during onModuleInit diagnostics',
        e
      )
    }
  }

  @OnQueueWaiting()
  onWaiting(jobId: number) {
    this.logger.debug(`[RoundQuestion Timeout] ⏳ (jobId=${jobId}) WAITING in queue`)
  }

  @OnQueueActive()
  async onActive(job: Job) {
    this.logger.log(
      `[RoundQuestion Timeout] ▶️ (jobId=${job.id}) ACTIVE - Processing roundQuestionId=${job.data?.roundQuestionId}`
    )

    // CRITICAL: Force Bull to pick waiting jobs (Bull v4 bug workaround)
    try {
      const waitingJobs = await this.roundQuestionTimeoutQueue.getWaiting()
      if (waitingJobs.length > 0) {
        this.logger.warn(
          `[RoundQuestion Timeout] 🚀 Found ${waitingJobs.length} WAITING jobs while job ${job.id} is ACTIVE, promoting them...`
        )
        for (const waitingJob of waitingJobs) {
          try {
            await waitingJob.promote()
            this.logger.warn(`[RoundQuestion Timeout] ✅ Promoted job ${waitingJob.id}`)
          } catch (e) {
            // Ignore promotion errors
          }
        }
      }
    } catch (e) {
      // Silent fail
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(
      `[RoundQuestion Timeout] ✅ (jobId=${job.id}) COMPLETED for roundQuestionId=${job.data?.roundQuestionId}`
    )
  }

  @OnQueueFailed()
  onFailed(job: Job, err: any) {
    this.logger.error(
      `[RoundQuestion Timeout] ❌❌❌ (jobId=${job?.id}) FAILED for roundQuestionId=${job?.data?.roundQuestionId}, matchRoundParticipantId=${job?.data?.matchRoundParticipantId}: ${err?.message}`,
      err?.stack
    )
    // Log additional job info
    this.logger.error(
      `[RoundQuestion Timeout] ❌ Failed job details: attemptsMade=${job?.attemptsMade}, timestamp=${job?.timestamp}, processedOn=${job?.processedOn}, finishedOn=${job?.finishedOn}`
    )
  }

  @Process({ name: BullAction.CHECK_QUESTION_TIMEOUT, concurrency: 10 })
  async handleQuestionTimeout(
    job: Job<{ roundQuestionId: number; matchRoundParticipantId: number }>
  ): Promise<void> {
    const { roundQuestionId, matchRoundParticipantId } = job.data

    this.logger.log(
      `[RoundQuestion Timeout] 🔵 PROCESSOR CALLED - roundQuestionId: ${roundQuestionId}, jobId=${job.id}, matchRoundParticipantId=${matchRoundParticipantId}`
    )

    this.logger.log(
      `[RoundQuestion Timeout] Processing question timeout for roundQuestionId: ${roundQuestionId}, jobId=${job.id}`
    )

    try {
      // Fetch the round question with debuff
      const roundQuestion = await this.roundQuestionRepo.findWithAnswers(roundQuestionId)

      if (!roundQuestion) {
        this.logger.error(
          `[RoundQuestion Timeout] ❌ RoundQuestion ${roundQuestionId} NOT FOUND in database! jobId=${job.id}, matchRoundParticipantId=${matchRoundParticipantId}`
        )
        throw new Error(`RoundQuestion ${roundQuestionId} not found`)
      }

      // ✅ CRITICAL: Check if answer already submitted - if yes, SKIP ENTIRELY
      const existingAnswerLog =
        await this.roundQuestionRepo.findAnswerLog(roundQuestionId)

      if (existingAnswerLog && existingAnswerLog.answerId !== null) {
        this.logger.log(
          `[RoundQuestion Timeout] ⏭️ RoundQuestion ${roundQuestionId} already answered (answerId=${existingAnswerLog.answerId}), skipping timeout processing completely (jobId=${job.id})`
        )
        return // ✅ CRITICAL: Exit immediately, don't process anything
      }

      // A timed-out question logs nothing: picking a random answer for it was
      // turned off (removed in B6c; whether a timeout scores 0 or a random
      // answer is an open product decision, see tracker batch 7c)

      // Find next question in order
      const nextQuestion = await this.roundQuestionRepo.findNextQuestion(
        matchRoundParticipantId,
        roundQuestion.orderNumber
      )

      // Get match and user info for socket notification
      const matchRoundParticipant = await this.roundQuestionRepo.findParticipantWithMatch(
        matchRoundParticipantId
      )

      if (!matchRoundParticipant) {
        this.logger.warn(
          `[RoundQuestion Timeout] MatchRoundParticipant ${matchRoundParticipantId} not found`
        )
        return
      }

      const currentUserId = matchRoundParticipant.matchParticipant.userId
      const matchId = matchRoundParticipant.matchRound.match.id
      let endTimeQuestion: Date | null = null

      // Get user's language preference from socket connection
      const userLang = this.socketServerService.getLangByUserId(currentUserId)

      // Prepare formatted nextQuestion via QuestionBankService so socket uses consistent shape
      let nextQuestionForNotify: any | null = null
      if (nextQuestion) {
        try {
          endTimeQuestion = addTimeUTC(new Date(), nextQuestion.timeLimitMs)
          const qbList = await this.questionBankService.getByIds(
            [nextQuestion.questionBankId],
            userLang
          )
          nextQuestionForNotify = qbList?.[0] || null
          // Always include debuff field (null if none)
          if (nextQuestionForNotify) {
            nextQuestionForNotify.debuff = nextQuestion.debuff || null
            // Include roundQuestionId so FE can reference it
            nextQuestionForNotify.roundQuestionId = nextQuestion.id
            nextQuestionForNotify.endTimeQuestion = endTimeQuestion.toISOString()
            // ✅ THÊM: timeLimitMs
            nextQuestionForNotify.timeLimitMs = nextQuestion.timeLimitMs
          }
          // Compute and persist server-side endTime for the next question BEFORE notifying FE

          await this.roundQuestionRepo.setQuestionEndTime(
            nextQuestion.id,
            endTimeQuestion
          )

          // Small offset + priority for concurrent processing
          const delayOffset = (matchRoundParticipantId % 2) * 250
          const priority = matchRoundParticipantId % 2 === 0 ? 1 : 2

          // DEBUG: Log current queue state BEFORE adding new job
          const queueCountsBefore = await this.roundQuestionTimeoutQueue.getJobCounts()
          this.logger.debug(
            `[RoundQuestion Timeout] 📊 Queue state BEFORE scheduling next: waiting=${queueCountsBefore.waiting}, delayed=${queueCountsBefore.delayed}, active=${queueCountsBefore.active}`
          )

          // CRITICAL: Use setTimeout instead of Bull queue to avoid race condition
          // Bull v4 has bug where concurrent delayed jobs get auto-deleted
          const timeoutKey = `${nextQuestion.id}-${matchRoundParticipantId}`
          const timeoutRef = setTimeout(async () => {
            // Auto-cleanup reference after execution
            this.timeoutRefs.delete(timeoutKey)

            try {
              await this.handleQuestionTimeout({
                id: `timeout-${nextQuestion.id}`,
                data: {
                  roundQuestionId: nextQuestion.id,
                  matchRoundParticipantId
                }
              } as any)
            } catch (err) {
              this.logger.error(
                `[RoundQuestion Timeout] setTimeout error for question ${nextQuestion.id}: ${err.message}`
              )
            }
          }, nextQuestion.timeLimitMs + delayOffset)

          // Store reference to allow cancellation
          this.timeoutRefs.set(timeoutKey, timeoutRef)

          this.logger.log(
            `[RoundQuestion Timeout] Scheduled next question ${nextQuestion.id} with setTimeout delay ${nextQuestion.timeLimitMs + delayOffset}ms, stored ref key=${timeoutKey}`
          )
        } catch (err) {
          this.logger.warn(
            `[RoundQuestion Timeout] Failed to fetch formatted questionBank for nextQuestion ${nextQuestion.id}: ${err?.message}`
          )
          nextQuestionForNotify = null
        }
      }

      // Send socket notification with next question (timeout scenario - no answer selected)
      this.matchingGateway.notifyQuestionAnswered(
        matchId,
        currentUserId,
        null, // No answer in timeout scenario
        nextQuestionForNotify
          ? {
              nextQuestion: {
                ...nextQuestionForNotify,
                timeLimitMs: nextQuestionForNotify.timeLimitMs,
                // ensure we send the computed endTime (fallback to existing DB value if available)
                endTimeQuestion:
                  nextQuestionForNotify.endTimeQuestion || nextQuestion?.endTimeQuestion
              }
            }
          : null
      )

      const isLastQuestion =
        roundQuestion.orderNumber >= matchRoundParticipant.questionsTotal

      if (isLastQuestion) {
        this.logger.log(
          `[RoundQuestion Timeout] Last question completed for participant ${matchRoundParticipantId}`
        )

        // Calculate total time and points from all answer logs
        const allAnswerLogs = await this.roundQuestionRepo.findAnswerLogsOfParticipant(
          matchRoundParticipantId
        )

        const totalTimeMs = allAnswerLogs.reduce(
          (sum, log) => sum + (log.timeAnswerMs || 0),
          0
        )
        const points = allAnswerLogs.reduce(
          (sum, log) => sum + (log.pointsEarned || 0),
          0
        )

        // Update MatchRoundParticipant with totals and COMPLETED status
        const updatedParticipant = await this.roundQuestionRepo.completeParticipant(
          matchRoundParticipantId,
          totalTimeMs,
          points
        )

        this.logger.log(
          `[RoundQuestion Timeout] Updated participant ${matchRoundParticipantId}: totalTimeMs=${totalTimeMs}, points=${points}, status=COMPLETED`
        )

        // Find opponent participant (match level)
        const opponentMatchParticipant =
          matchRoundParticipant.matchRound.match.participants.find(
            (p) => p.userId !== currentUserId
          )

        if (opponentMatchParticipant) {
          // Notify current user about their completion
          this.matchingGateway.notifyQuestionCompleted(
            matchId,
            currentUserId,
            updatedParticipant
          )

          // Find opponent's MatchRoundParticipant to check their status
          const opponentRoundParticipant =
            await this.roundQuestionRepo.findOpponentInRound(
              matchRoundParticipant.matchRoundId,
              opponentMatchParticipant.userId
            )

          // Only notify opponent if they haven't completed yet
          if (opponentRoundParticipant?.status !== 'COMPLETED') {
            this.matchingGateway.notifyOpponentCompleted(
              matchId,
              opponentMatchParticipant.userId
            )
            this.logger.log(
              `[RoundQuestion Timeout] Notified opponent ${opponentMatchParticipant.userId} that user ${currentUserId} completed`
            )
          } else {
            this.logger.log(
              `[RoundQuestion Timeout] Opponent ${opponentMatchParticipant.userId} already completed, skipping OPPONENT_COMPLETED notification`
            )
          }
        }

        // Check if opponent also completed
        try {
          await this.roundCompletion.checkAndCompleteRound(
            matchRoundParticipant.matchRoundId,
            matchId
          )
        } catch (error) {
          // the timeout job does not fail on it (as before): logged only
          this.logger.error(
            `[RoundQuestion Timeout] Error in checkAndCompleteRound for round ${matchRoundParticipant.matchRoundId}`,
            error
          )
        }

        return // No more questions to schedule
      }

      // No need to schedule again here because we already persisted and enqueued above before notifying
      if (!nextQuestion) {
        this.logger.log(
          `[RoundQuestion Timeout] No more questions for participant ${matchRoundParticipantId} - round completed`
        )
      }
    } catch (error) {
      this.logger.error(
        `[RoundQuestion Timeout] Error processing question timeout for roundQuestionId ${roundQuestionId}`,
        error
      )
      throw error
    }
  }
}
