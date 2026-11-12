import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { QuestionBankRepo } from '@/modules/question-bank/question-bank.repo'
import {
  addTimeUTC,
  calculateEloGain,
  calculateEloLoss,
  convertEloToRank
} from '@/shared/helpers'
import { PrismaService } from '@/shared/services/prisma.service'
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
    private readonly prismaService: PrismaService,
    private readonly matchingGateway: MatchingGateway,
    private readonly questionBankRepo: QuestionBankRepo,
    private readonly socketServerService: SocketServerService,
    @InjectQueue(BullQueue.ROUND_QUESTION_TIMEOUT)
    private readonly roundQuestionTimeoutQueue: Queue,
    @InjectQueue(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
    private readonly matchRoundParticipantTimeoutQueue: Queue
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

  /**
   * Calculate points earned based on answer speed and debuffs
   * @param isCorrect - Whether answer is correct
   * @param basePoints - Base points for the question
   * @param timeAnswerMs - Time taken to answer in milliseconds
   * @param timeLimitMs - Time limit for the question
   * @param debuff - Debuff applied to the question (if any)
   * @returns Points earned (0 for incorrect, minimum 50% of base for correct)
   */
  private calculatePointsEarned(
    isCorrect: boolean,
    basePoints: number,
    timeAnswerMs: number,
    timeLimitMs: number,
    debuff?: { typeDebuff: string; valueDebuff: number } | null
  ): number {
    if (!isCorrect) return 0

    // Calculate points: points = basePoints * (1 - timeAnswer / timeLimit)
    const timeRatio = Math.min(timeAnswerMs / timeLimitMs, 1.0)
    let points = basePoints * (1 - timeRatio)

    // Ensure minimum 50% of base points for correct answers
    points = Math.max(points, basePoints * 0.5)

    // Apply DECREASE_POINT debuff if present
    if (debuff && debuff.typeDebuff === 'DECREASE_POINT') {
      points -= debuff.valueDebuff
      // After debuff, still ensure minimum 50% of base points
      points = Math.max(points, basePoints * 0.5)
    }

    return Math.ceil(points) // Làm tròn lên
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
      const roundQuestion = await this.prismaService.roundQuestion.findUnique({
        where: { id: roundQuestionId },
        include: {
          questionBank: {
            include: {
              answers: true
            }
          },
          debuff: true
        }
      })

      if (!roundQuestion) {
        this.logger.error(
          `[RoundQuestion Timeout] ❌ RoundQuestion ${roundQuestionId} NOT FOUND in database! jobId=${job.id}, matchRoundParticipantId=${matchRoundParticipantId}`
        )
        throw new Error(`RoundQuestion ${roundQuestionId} not found`)
      }

      // ✅ CRITICAL: Check if answer already submitted - if yes, SKIP ENTIRELY
      const existingAnswerLog =
        await this.prismaService.roundQuestionsAnswerLog.findFirst({
          where: { roundQuestionId }
        })

      if (existingAnswerLog && existingAnswerLog.answerId !== null) {
        this.logger.log(
          `[RoundQuestion Timeout] ⏭️ RoundQuestion ${roundQuestionId} already answered (answerId=${existingAnswerLog.answerId}), skipping timeout processing completely (jobId=${job.id})`
        )
        return // ✅ CRITICAL: Exit immediately, don't process anything
      }

      let finalAnswerLog: any = existingAnswerLog

      // Auto-select random answer (timeout scenario only if NOT answered)
      // const answers = roundQuestion.questionBank.answers
      // if (answers.length === 0) {
      //   this.logger.warn(
      //     `[RoundQuestion Timeout] No answers available for question ${roundQuestion.questionBankId}`
      //   )
      // } else {
      //   const randomAnswer = answers[Math.floor(Math.random() * answers.length)]

      //   // Calculate points: timeout = full time, so 50% of base if correct (or 0 if wrong)
      //   const pointsEarned = this.calculatePointsEarned(
      //     randomAnswer.isCorrect,
      //     roundQuestion.basePoints,
      //     roundQuestion.timeLimitMs, // Timeout = full time
      //     roundQuestion.timeLimitMs,
      //     roundQuestion.debuff
      //   )

      //   if (existingAnswerLog) {
      //     // Update existing log
      //     finalAnswerLog = await this.prismaService.roundQuestionsAnswerLog.update({
      //       where: { id: existingAnswerLog.id },
      //       data: {
      //         answerId: randomAnswer.id,
      //         timeAnswerMs: roundQuestion.timeLimitMs,
      //         isCorrect: randomAnswer.isCorrect,
      //         pointsEarned
      //       }
      //     })
      //     this.logger.log(
      //       `[RoundQuestion Timeout] Updated answerlog ${existingAnswerLog.id} with random answer ${randomAnswer.id} (timeout), pointsEarned=${pointsEarned}`
      //     )
      //   } else {
      //     // Create new log
      //     finalAnswerLog = await this.prismaService.roundQuestionsAnswerLog.create({
      //       data: {
      //         roundQuestionId,
      //         answerId: randomAnswer.id,
      //         timeAnswerMs: roundQuestion.timeLimitMs,
      //         isCorrect: randomAnswer.isCorrect,
      //         pointsEarned
      //       }
      //     })
      //     this.logger.log(
      //       `[RoundQuestion Timeout] Created answerlog with random answer ${randomAnswer.id} (timeout), pointsEarned=${pointsEarned}`
      //     )
      //   }
      // }

      // Find next question in order
      const nextQuestion = await this.prismaService.roundQuestion.findFirst({
        where: {
          matchRoundParticipantId,
          orderNumber: { gt: roundQuestion.orderNumber }
        },
        orderBy: { orderNumber: 'asc' },
        include: {
          questionBank: {
            include: {
              answers: true
            }
          },
          debuff: true
        }
      })

      // Get match and user info for socket notification
      const matchRoundParticipant =
        await this.prismaService.matchRoundParticipant.findUnique({
          where: { id: matchRoundParticipantId },
          include: {
            matchParticipant: {
              include: {
                user: true
              }
            },
            matchRound: {
              include: {
                match: {
                  include: {
                    participants: {
                      include: {
                        user: true
                      }
                    }
                  }
                }
              }
            }
          }
        })

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
          const qbList = await this.questionBankRepo.findByIds(
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

          await this.prismaService.roundQuestion.update({
            where: { id: nextQuestion.id },
            data: { endTimeQuestion }
          })

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
        const allAnswerLogs = await this.prismaService.roundQuestionsAnswerLog.findMany({
          where: {
            roundQuestion: {
              matchRoundParticipantId
            }
          }
        })

        const totalTimeMs = allAnswerLogs.reduce(
          (sum, log) => sum + (log.timeAnswerMs || 0),
          0
        )
        const points = allAnswerLogs.reduce(
          (sum, log) => sum + (log.pointsEarned || 0),
          0
        )

        // Update MatchRoundParticipant with totals and COMPLETED status
        const updatedParticipant = await this.prismaService.matchRoundParticipant.update({
          where: { id: matchRoundParticipantId },
          data: {
            totalTimeMs,
            points,
            status: 'COMPLETED'
          },
          include: {
            selectedUserPokemon: {
              include: {
                pokemon: true
              }
            },
            debuff: true
          }
        })

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
            await this.prismaService.matchRoundParticipant.findFirst({
              where: {
                matchRoundId: matchRoundParticipant.matchRoundId,
                matchParticipant: {
                  userId: opponentMatchParticipant.userId
                }
              }
            })

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
        await this.checkAndCompleteRound(matchRoundParticipant.matchRoundId, matchId)

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

  /**
   * Check if both participants completed, compare results, update round winner, and schedule next round
   */
  private async checkAndCompleteRound(
    matchRoundId: number,
    matchId: number
  ): Promise<void> {
    try {
      // Fetch all participants of this round with round data
      const matchRound = await this.prismaService.matchRound.findUnique({
        where: { id: matchRoundId },
        include: {
          participants: {
            include: {
              matchParticipant: {
                include: {
                  user: true
                }
              }
            }
          }
        }
      })

      if (!matchRound) {
        this.logger.warn(`[RoundQuestion Timeout] MatchRound ${matchRoundId} not found`)
        return
      }

      // ✅ GUARD: Skip if round already COMPLETED to prevent duplicate emissions
      if (matchRound.status === 'COMPLETED') {
        this.logger.log(
          `[RoundQuestion Timeout] Round ${matchRoundId} already COMPLETED, skipping duplicate completion`
        )
        return
      }

      const allParticipants = matchRound.participants

      // Check if both participants completed
      const allCompleted = allParticipants.every((p) => p.status === 'COMPLETED')

      if (!allCompleted) {
        // Find who completed
        const completedParticipant = allParticipants.find((p) => p.status === 'COMPLETED')
        if (completedParticipant) {
          const completedUserId = completedParticipant.matchParticipant.userId
          this.matchingGateway.notifyWaitingForOpponent(
            matchId,
            completedUserId,
            matchRound.roundNumber
          )
          this.logger.log(
            `[RoundQuestion Timeout] User ${completedUserId} completed round ${matchRound.roundNumber}, waiting for opponent`
          )
        }

        this.logger.log(
          `[RoundQuestion Timeout] Not all participants completed for round ${matchRoundId}, waiting...`
        )
        return
      }

      this.logger.log(
        `[RoundQuestion Timeout] Both participants completed for round ${matchRoundId}, comparing results...`
      )

      // ✅ NEW LOGIC: Check for tie scenarios
      const [p1, p2] = allParticipants

      // Fetch answer counts for both participants
      const p1AnswerCount = await this.prismaService.roundQuestionsAnswerLog.count({
        where: {
          roundQuestion: {
            matchRoundParticipantId: p1.id
          },
          answerId: { not: null } // Count only answered questions
        }
      })

      const p2AnswerCount = await this.prismaService.roundQuestionsAnswerLog.count({
        where: {
          roundQuestion: {
            matchRoundParticipantId: p2.id
          },
          answerId: { not: null }
        }
      })

      this.logger.log(
        `[RoundQuestion Timeout] Round results: p1={points:${p1.points}, answers:${p1AnswerCount}}, p2={points:${p2.points}, answers:${p2AnswerCount}}`
      )

      let winnerId: number | null = null

      // ✅ TIE CASE 1: Both have 0 points and neither answered any question
      if (
        (p1.points || 0) === 0 &&
        (p2.points || 0) === 0 &&
        p1AnswerCount === 0 &&
        p2AnswerCount === 0
      ) {
        this.logger.log(
          `[RoundQuestion Timeout] TIE: Both participants have 0 points and no answers`
        )
        winnerId = null
      }
      // ✅ TIE CASE 2: Both have 0 points, but one answered and one didn't
      else if (
        (p1.points || 0) === 0 &&
        (p2.points || 0) === 0 &&
        p1AnswerCount === 0 &&
        p2AnswerCount > 0
      ) {
        winnerId = p2.matchParticipantId
        this.logger.log(
          `[RoundQuestion Timeout] Participant ${p2.matchParticipantId} wins: answered ${p2AnswerCount} questions vs ${p1AnswerCount}`
        )
      } else if (
        (p1.points || 0) === 0 &&
        (p2.points || 0) === 0 &&
        p1AnswerCount > 0 &&
        p2AnswerCount === 0
      ) {
        winnerId = p1.matchParticipantId
        this.logger.log(
          `[RoundQuestion Timeout] Participant ${p1.matchParticipantId} wins: answered ${p1AnswerCount} questions vs ${p2AnswerCount}`
        )
      }
      // ✅ Normal comparison: higher points wins
      else if ((p1.points || 0) > (p2.points || 0)) {
        winnerId = p1.matchParticipantId
        this.logger.log(
          `[RoundQuestion Timeout] Participant ${p1.matchParticipantId} wins with ${p1.points} points vs ${p2.points}`
        )
      } else if ((p1.points || 0) < (p2.points || 0)) {
        winnerId = p2.matchParticipantId
        this.logger.log(
          `[RoundQuestion Timeout] Participant ${p2.matchParticipantId} wins with ${p2.points} points vs ${p1.points}`
        )
      } else {
        // Equal points, compare time
        if ((p1.totalTimeMs || 0) < (p2.totalTimeMs || 0)) {
          winnerId = p1.matchParticipantId
          this.logger.log(
            `[RoundQuestion Timeout] Participant ${p1.matchParticipantId} wins by faster time: ${p1.totalTimeMs}ms vs ${p2.totalTimeMs}ms`
          )
        } else {
          winnerId = p2.matchParticipantId
          this.logger.log(
            `[RoundQuestion Timeout] Participant ${p2.matchParticipantId} wins by faster time: ${p2.totalTimeMs}ms vs ${p1.totalTimeMs}ms`
          )
        }
      }

      // Update MatchRound with winner and COMPLETED status
      const updatedRound = await this.prismaService.matchRound.update({
        where: { id: matchRoundId },
        data: {
          status: 'COMPLETED',
          roundWinnerId: winnerId // ✅ Can be null for tie
        },
        include: {
          participants: {
            include: {
              matchParticipant: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      avatar: true
                    }
                  }
                }
              },
              selectedUserPokemon: {
                include: {
                  pokemon: {
                    select: {
                      id: true,
                      pokedex_number: true,
                      nameJp: true,
                      nameTranslations: true,
                      rarity: true,
                      imageUrl: true
                    }
                  }
                }
              }
            }
          },
          roundWinner: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true
                }
              }
            }
          }
        }
      })

      this.logger.log(
        `[RoundQuestion Timeout] Round ${matchRoundId} completed${winnerId === null ? ' (TIE)' : ''}, winner: ${winnerId}`
      )

      // Send socket notification to both users
      const userId1 = allParticipants[0].matchParticipant.userId
      const userId2 = allParticipants[1].matchParticipant.userId
      this.matchingGateway.notifyRoundCompleted(matchId, userId1, userId2, updatedRound)

      // Schedule next round
      await this.scheduleNextRound(matchId, updatedRound.roundNumber)
    } catch (error) {
      this.logger.error(
        `[RoundQuestion Timeout] Error in checkAndCompleteRound for round ${matchRoundId}`,
        error
      )
    }
  }

  /**
   * Schedule next round: send countdown and enqueue START_ROUND job with 5s delay
   */
  private async scheduleNextRound(
    matchId: number,
    currentRoundNumber: string
  ): Promise<void> {
    try {
      const roundMap: Record<string, string | null> = {
        ONE: 'TWO',
        TWO: 'THREE',
        THREE: null
      }

      const nextRoundNumber = roundMap[currentRoundNumber]

      if (!nextRoundNumber) {
        this.logger.log(
          `[RoundQuestion Timeout] No next round after ${currentRoundNumber}, calculating match winner for match ${matchId}`
        )
        // Calculate match winner and complete match
        await this.completeMatch(matchId)
        return
      }

      this.logger.log(
        `[RoundQuestion Timeout] Scheduling next round ${nextRoundNumber} for match ${matchId}`
      )

      // Find next round with participants
      const nextRound = await this.prismaService.matchRound.findFirst({
        where: {
          matchId,
          roundNumber: nextRoundNumber as any,
          deletedAt: null
        },
        include: {
          participants: {
            include: {
              matchParticipant: {
                include: {
                  user: true
                }
              }
            },
            orderBy: { orderSelected: 'asc' }
          }
        }
      })

      if (!nextRound) {
        this.logger.warn(
          `[RoundQuestion Timeout] Next round ${nextRoundNumber} not found for match ${matchId}`
        )
        return
      }

      // ✅ GUARD: Check if round already IN_PROGRESS to prevent duplicate notifications
      if (nextRound.status === 'IN_PROGRESS') {
        this.logger.warn(
          `[RoundQuestion Timeout] Round ${nextRoundNumber} already IN_PROGRESS for match ${matchId}, skipping notifyRoundStarting`
        )
        return
      }

      // Get user IDs for socket notification
      const userId1 = nextRound.participants[0]?.matchParticipant.userId
      const userId2 = nextRound.participants[1]?.matchParticipant.userId

      if (!userId1 || !userId2) {
        this.logger.warn(
          `[RoundQuestion Timeout] Missing participants for next round ${nextRoundNumber}`
        )
        return
      }

      // Send countdown notification (5 seconds)
      this.matchingGateway.notifyRoundStarting(
        matchId,
        userId1,
        userId2,
        nextRoundNumber,
        5
      )

      // Enqueue START_ROUND job with 5-second delay
      await this.matchRoundParticipantTimeoutQueue.add(
        BullAction.START_ROUND,
        {
          matchRoundId: nextRound.id,
          matchId
        },
        {
          delay: 5000
        }
      )

      this.logger.log(
        `[RoundQuestion Timeout] Scheduled Round ${nextRoundNumber} to start in 5 seconds for match ${matchId}`
      )
    } catch (error) {
      this.logger.error(
        `[RoundQuestion Timeout] Error scheduling next round after ${currentRoundNumber}`,
        error
      )
    }
  }

  /**
   * Complete match: calculate overall winner, update Match status, and notify users
   */
  private async completeMatch(matchId: number): Promise<void> {
    // Guard check: prevent duplicate processing if match already completed
    const currentMatch = await this.prismaService.match.findUnique({
      where: { id: matchId },
      select: { status: true }
    })

    if (currentMatch?.status === 'COMPLETED') {
      this.logger.log(
        `[RoundQuestion Timeout] Match ${matchId} already COMPLETED, skipping duplicate processing`
      )
      return
    }

    try {
      this.logger.log(`[RoundQuestion Timeout] Completing match ${matchId}`)

      // Fetch all 3 rounds with winners
      const allRounds = await this.prismaService.matchRound.findMany({
        where: { matchId, deletedAt: null },
        include: {
          roundWinner: {
            include: {
              user: true
            }
          },
          participants: {
            include: {
              matchParticipant: {
                include: {
                  user: true
                }
              }
            }
          }
        },
        orderBy: { roundNumber: 'asc' }
      })

      if (allRounds.length !== 3) {
        this.logger.warn(
          `[RoundQuestion Timeout] Expected 3 rounds for match ${matchId}, found ${allRounds.length}`
        )
        return
      }

      // ✅ NEW LOGIC: Count round wins and ties
      const roundWinCounts = new Map<number, number>()
      let tieCount = 0

      for (const round of allRounds) {
        if (round.roundWinnerId) {
          const currentCount = roundWinCounts.get(round.roundWinnerId) || 0
          roundWinCounts.set(round.roundWinnerId, currentCount + 1)
        } else {
          // ✅ Round is a tie (roundWinnerId is null)
          tieCount++
        }
      }

      // Determine match winner: participant with most round wins
      let matchWinnerId: number | null = null
      let maxWins = 0

      for (const [participantId, wins] of roundWinCounts.entries()) {
        if (wins > maxWins) {
          maxWins = wins
          matchWinnerId = participantId
        }
      }

      // ✅ MATCH TIE: No one won 2 rounds (all 3 are ties OR 1-1-tie, etc.)
      if (maxWins === 0 && tieCount > 0) {
        this.logger.log(
          `[RoundQuestion Timeout] MATCH TIE: All 3 rounds resulted in ties (no clear winner)`
        )
        matchWinnerId = null
      } else if (maxWins === 0 || !matchWinnerId) {
        // ✅ Fallback: Use total points as tiebreaker
        this.logger.warn(
          `[RoundQuestion Timeout] No clear winner found by round wins, using total points tiebreaker`
        )

        const participantTotals = new Map<number, number>()
        for (const round of allRounds) {
          for (const participant of round.participants) {
            const currentTotal =
              participantTotals.get(participant.matchParticipantId) || 0
            participantTotals.set(
              participant.matchParticipantId,
              currentTotal + (participant.points || 0)
            )
          }
        }

        let maxPoints = 0
        for (const [participantId, totalPoints] of participantTotals.entries()) {
          if (totalPoints > maxPoints) {
            maxPoints = totalPoints
            matchWinnerId = participantId
          }
        }

        // ✅ If still no winner (all totals are 0), it's a tie
        if (maxPoints === 0 && matchWinnerId) {
          this.logger.log(
            `[RoundQuestion Timeout] MATCH TIE: Both players have 0 total points`
          )
          matchWinnerId = null
        }
      }

      // ✅ Handle tie case: no winner
      let winnerParticipant: any = null
      if (matchWinnerId) {
        winnerParticipant = await this.prismaService.matchParticipant.findUnique({
          where: { id: matchWinnerId },
          include: { user: true }
        })
        this.logger.log(
          `[RoundQuestion Timeout] Match winner determined: participantId=${matchWinnerId}, userId=${winnerParticipant?.userId}, maxWins=${maxWins}`
        )
      } else {
        this.logger.log(
          `[RoundQuestion Timeout] Match is a TIE: no winner, maxWins=${maxWins}`
        )
      }

      // Wrap entire flow in atomic transaction to prevent race conditions
      const result = await this.prismaService.$transaction(
        async (tx) => {
          // First, update match status to COMPLETED to claim ownership
          const completedMatch = await tx.match.update({
            where: { id: matchId },
            data: {
              status: 'COMPLETED',
              winnerId: winnerParticipant?.userId || null
            },
            include: {
              winner: true,
              participants: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      avatar: true,
                      eloscore: true
                    }
                  }
                }
              },
              rounds: {
                include: {
                  roundWinner: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                          avatar: true,
                          eloscore: true
                        }
                      }
                    }
                  },
                  participants: {
                    include: {
                      matchParticipant: {
                        include: {
                          user: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                              avatar: true,
                              eloscore: true
                            }
                          }
                        }
                      },
                      selectedUserPokemon: {
                        include: {
                          pokemon: {
                            select: {
                              id: true,
                              pokedex_number: true,
                              nameJp: true,
                              nameTranslations: true,
                              rarity: true,
                              imageUrl: true
                            }
                          }
                        }
                      }
                    }
                  }
                },
                orderBy: { roundNumber: 'asc' }
              }
            }
          })

          // Calculate and update ELO within same transaction
          const participants = completedMatch.participants || []
          const winnerUserId = completedMatch.winnerId
          const loserUserId = participants.find((p) => p.userId !== winnerUserId)?.userId

          let eloGained = 0
          let eloLost = 0

          // Track rank changes for each participant
          const rankChanges = new Map<number, any>()

          if (winnerUserId && loserUserId) {
            const winnerUser = participants.find((p) => p.userId === winnerUserId)?.user
            const loserUser = participants.find((p) => p.userId === loserUserId)?.user

            const winnerElo = (winnerUser && winnerUser.eloscore) || 0
            const loserElo = (loserUser && loserUser.eloscore) || 0

            this.logger.log(
              `[RoundQuestion Timeout] ELO before: winner=${winnerElo}, loser=${loserElo}`
            )

            eloGained = calculateEloGain(winnerElo, loserElo)
            eloLost = calculateEloLoss(loserElo, winnerElo)

            this.logger.log(
              `[RoundQuestion Timeout] ELO delta: gained=${eloGained}, lost=${eloLost}`
            )

            const newWinnerElo = Math.min(3000, winnerElo + eloGained)
            const newLoserElo = Math.max(0, loserElo - eloLost)

            // Calculate rank changes for winner
            const winnerOldRank = convertEloToRank(winnerElo)
            const winnerNewRank = convertEloToRank(newWinnerElo)
            let winnerStatus: string
            if (winnerOldRank !== winnerNewRank) {
              winnerStatus = 'RANK_UP'
            } else {
              winnerStatus = 'RANK_MAINTAIN'
            }
            rankChanges.set(winnerUserId, {
              status: winnerStatus,
              rankInfo: {
                from: { rank: winnerOldRank, elo: winnerElo },
                to: { rank: winnerNewRank, elo: newWinnerElo }
              }
            })

            // Calculate rank changes for loser
            const loserOldRank = convertEloToRank(loserElo)
            const loserNewRank = convertEloToRank(newLoserElo)
            let loserStatus: string
            if (loserOldRank !== loserNewRank) {
              loserStatus = 'RANK_DOWN'
            } else {
              loserStatus = 'RANK_MAINTAIN'
            }
            rankChanges.set(loserUserId, {
              status: loserStatus,
              rankInfo: {
                from: { rank: loserOldRank, elo: loserElo },
                to: { rank: loserNewRank, elo: newLoserElo }
              }
            })

            // Update Match with ELO deltas
            await tx.match.update({
              where: { id: matchId },
              data: { eloGained, eloLost }
            })

            // Update winner ELO (cap at 3000)
            await tx.user.update({
              where: { id: winnerUserId },
              data: { eloscore: newWinnerElo }
            })

            // Update loser ELO
            await tx.user.update({
              where: { id: loserUserId },
              data: { eloscore: newLoserElo }
            })

            this.logger.log(
              `[RoundQuestion Timeout] ELO after: winner=${newWinnerElo}, loser=${newLoserElo}`
            )
          } else {
            // ✅ MATCH TIE: Check if both players didn't answer any questions
            const user1 = participants[0]
            const user2 = participants[1]

            if (user1 && user2) {
              // Count total answers across all 3 rounds for each user
              const user1AnswerCount = await tx.roundQuestionsAnswerLog.count({
                where: {
                  roundQuestion: {
                    matchRoundParticipant: {
                      matchRound: {
                        matchId
                      },
                      matchParticipant: {
                        userId: user1.userId
                      }
                    }
                  },
                  answerId: { not: null }
                }
              })

              const user2AnswerCount = await tx.roundQuestionsAnswerLog.count({
                where: {
                  roundQuestion: {
                    matchRoundParticipant: {
                      matchRound: {
                        matchId
                      },
                      matchParticipant: {
                        userId: user2.userId
                      }
                    }
                  },
                  answerId: { not: null }
                }
              })

              // ✅ If BOTH didn't answer any questions -> Both lose ELO
              if (user1AnswerCount === 0 && user2AnswerCount === 0) {
                const user1Elo = user1.user?.eloscore || 0
                const user2Elo = user2.user?.eloscore || 0

                // Calculate ELO loss for both (use average ELO as opponent)
                const avgElo = (user1Elo + user2Elo) / 2
                const user1EloLoss = calculateEloLoss(user1Elo, avgElo)
                const user2EloLoss = calculateEloLoss(user2Elo, avgElo)

                this.logger.log(
                  `[RoundQuestion Timeout] Match TIE (no answers): Both lose ELO - user1Loss=${user1EloLoss}, user2Loss=${user2EloLoss}`
                )

                const newUser1Elo = Math.max(0, user1Elo - user1EloLoss)
                const newUser2Elo = Math.max(0, user2Elo - user2EloLoss)

                // Calculate rank changes for user1
                const user1OldRank = convertEloToRank(user1Elo)
                const user1NewRank = convertEloToRank(newUser1Elo)
                let user1Status: string
                if (user1OldRank !== user1NewRank) {
                  user1Status = 'RANK_DOWN'
                } else {
                  user1Status = 'RANK_MAINTAIN'
                }
                rankChanges.set(user1.userId, {
                  status: user1Status,
                  rankInfo: {
                    from: { rank: user1OldRank, elo: user1Elo },
                    to: { rank: user1NewRank, elo: newUser1Elo }
                  }
                })

                // Calculate rank changes for user2
                const user2OldRank = convertEloToRank(user2Elo)
                const user2NewRank = convertEloToRank(newUser2Elo)
                let user2Status: string
                if (user2OldRank !== user2NewRank) {
                  user2Status = 'RANK_DOWN'
                } else {
                  user2Status = 'RANK_MAINTAIN'
                }
                rankChanges.set(user2.userId, {
                  status: user2Status,
                  rankInfo: {
                    from: { rank: user2OldRank, elo: user2Elo },
                    to: { rank: user2NewRank, elo: newUser2Elo }
                  }
                })

                // Update both users' ELO (deduct)
                await tx.user.update({
                  where: { id: user1.userId },
                  data: { eloscore: newUser1Elo }
                })

                await tx.user.update({
                  where: { id: user2.userId },
                  data: { eloscore: newUser2Elo }
                })

                // Store the loss amount (both lose, so eloLost represents the penalty)
                eloLost = Math.round((user1EloLoss + user2EloLoss) / 2) // Average loss

                await tx.match.update({
                  where: { id: matchId },
                  data: { eloGained: 0, eloLost }
                })

                this.logger.log(
                  `[RoundQuestion Timeout] ELO after penalty: user1=${newUser1Elo}, user2=${newUser2Elo}`
                )
              } else {
                // Normal tie with answers -> No ELO changes
                this.logger.log(
                  `[RoundQuestion Timeout] Match TIE (with answers): No ELO changes, eloGained=${eloGained}, eloLost=${eloLost}`
                )
              }
            }
          }

          return { completedMatch, eloGained, eloLost, rankChanges }
        },
        {
          timeout: 10000
        }
      )

      this.logger.log(
        `[RoundQuestion Timeout] Transaction completed successfully for match ${matchId}`
      )

      // Re-fetch match with updated ELO for notification (outside transaction)
      const userId1 = result.completedMatch.participants[0]?.userId
      const userId2 = result.completedMatch.participants[1]?.userId

      if (userId1 && userId2) {
        const updatedMatch = await this.prismaService.match.findUnique({
          where: { id: matchId },
          include: {
            winner: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                eloscore: true
              }
            },
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    eloscore: true
                  }
                }
              }
            },
            rounds: {
              include: {
                roundWinner: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                        eloscore: true
                      }
                    }
                  }
                },
                participants: {
                  include: {
                    matchParticipant: {
                      include: {
                        user: {
                          select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true,
                            eloscore: true
                          }
                        }
                      }
                    },
                    selectedUserPokemon: {
                      include: {
                        pokemon: {
                          select: {
                            id: true,
                            pokedex_number: true,
                            nameJp: true,
                            nameTranslations: true,
                            rarity: true,
                            imageUrl: true
                          }
                        }
                      }
                    }
                  }
                }
              },
              orderBy: { roundNumber: 'asc' }
            }
          }
        })

        this.logger.log(
          `[RoundQuestion Timeout] Sending match completed notification for match ${matchId}`
        )

        // Enhance match data with rank changes
        const matchWithRankChanges = {
          ...updatedMatch,
          participants:
            updatedMatch?.participants.map((p) => {
              const rankChange = result.rankChanges.get(p.userId)
              return {
                ...p,
                rankChangeStatus: rankChange?.status || 'RANK_MAINTAIN',
                rankChangeInfo: rankChange?.rankInfo || null
              }
            }) || []
        }

        this.matchingGateway.notifyMatchCompleted(
          matchId,
          userId1,
          userId2,
          matchWithRankChanges || result.completedMatch
        )
      }
    } catch (error) {
      this.logger.error(
        `[RoundQuestion Timeout] Error completing match ${matchId}`,
        error
      )
      // Don't swallow errors - let them bubble up
      throw error
    }
  }
}
