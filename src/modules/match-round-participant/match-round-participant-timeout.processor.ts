import { MatchRoundService } from '@/modules/match-round/match-round.service'
import { UserPokemonService } from '@/modules/user-pokemon/user-pokemon.service'
import { MatchRoundParticipantRepo } from './match-round-participant.repo'
import { TIME_CHOOSE_POKEMON_MS } from './match-round-participant.constants'
import { RoundStartService } from './round-start.service'
import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { QuestionBankService } from '@/modules/question-bank/question-bank.service'
import { addTimeUTC } from '@/shared/helpers'
import { MatchService } from '@/modules/match/match.service'
import { RoundQuestionService } from '@/modules/round-question/round-question.service'
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
import { forwardRef, Inject, Logger, OnModuleInit } from '@nestjs/common'
import { Job, Queue } from 'bull'
import { RoundQuestionTimeoutProcessor } from '@/modules/round-question/round-question-timeout.processor'

@Processor(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
export class MatchRoundParticipantTimeoutProcessor implements OnModuleInit {
  private readonly logger = new Logger(MatchRoundParticipantTimeoutProcessor.name)

  constructor(
    private readonly matchRoundParticipantRepo: MatchRoundParticipantRepo,
    private readonly matchRoundService: MatchRoundService,
    private readonly matchService: MatchService,
    private readonly userPokemonService: UserPokemonService,
    private readonly roundQuestionService: RoundQuestionService,
    private readonly questionBankService: QuestionBankService,
    @InjectQueue(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
    private readonly matchRoundParticipantTimeoutQueue: Queue,
    @Inject(MatchingGateway)
    private readonly matchingGateway: MatchingGateway,
    @Inject(forwardRef(() => RoundQuestionTimeoutProcessor))
    private readonly roundQuestionProcessor: RoundQuestionTimeoutProcessor,
    private readonly socketServerService: SocketServerService,
    private readonly roundStart: RoundStartService
  ) {}

  async onModuleInit() {
    this.logger.log(
      'MatchRoundParticipantTimeoutProcessor initialized with MatchingGateway'
    )
    try {
      await this.matchRoundParticipantTimeoutQueue.isReady()
      // Ensure the queue is not paused (resume both local and global just in case)
      try {
        await this.matchRoundParticipantTimeoutQueue.resume(true)
        this.logger.log('[RoundParticipant Timeout] Queue resumed (global=true)')
      } catch (e) {
        this.logger.warn(
          '[RoundParticipant Timeout] Queue resume skipped/failed',
          e as any
        )
      }
      const counts = await this.matchRoundParticipantTimeoutQueue.getJobCounts()
      this.logger.log(
        `[RoundParticipant Timeout] Queue job counts on init: ${Object.entries(counts)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')}`
      )
      // Probe any waiting jobs to log their names
      const waitingJobs = await this.matchRoundParticipantTimeoutQueue.getJobs([
        'waiting'
      ])
      if (waitingJobs.length) {
        this.logger.warn(
          `[RoundParticipant Timeout] Found ${waitingJobs.length} waiting jobs on init: ${waitingJobs
            .map((j) => `id=${j.id},name=${j.name}`)
            .join(' | ')}`
        )
      }

      // Bull v4 delayed job processing with aggressive promotion
      this.logger.log(
        '[RoundParticipant Timeout] Setting up aggressive delayed job promotion'
      )

      // Check every 100ms for delayed jobs that should be promoted
      // setInterval(async () => {
      //   try {
      //     const delayed = await this.matchRoundParticipantTimeoutQueue.getDelayed(0, 100)
      //     const now = Date.now()

      //     for (const job of delayed) {
      //       // Check if job delay has expired
      //       const jobDelay = job.opts?.delay || 0
      //       const jobTimestamp = job.timestamp || 0
      //       const shouldRun = now >= jobTimestamp + jobDelay

      //       if (shouldRun) {
      //         try {
      //           await job.promote()
      //           this.logger.log(
      //             `[RoundParticipant Timeout] 🚀 Force promoted delayed job ${job.id} (mrp=${job.data?.matchRoundParticipantId})`
      //           )
      //         } catch (e) {
      //           // Job might already be promoted, ignore error
      //         }
      //       }
      //     }
      //   } catch (e) {
      //     // Silent fail - queue might be empty
      //   }
      // }, 100)
    } catch (e) {
      this.logger.error(
        '[RoundParticipant Timeout] Error during onModuleInit diagnostics',
        e
      )
    }
  }

  // Queue lifecycle diagnostics to trace job progression
  @OnQueueWaiting()
  onWaiting(jobId: number) {
    this.logger.warn(
      `[RoundParticipant Timeout] ⏳ (jobId=${jobId}) WAITING in queue - awaiting worker activation`
    )
    // Try to fetch job details to confirm name matches processor
    this.matchRoundParticipantTimeoutQueue.getJob(jobId).then(async (job) => {
      if (job) {
        this.logger.warn(
          `[RoundParticipant Timeout] ⏳ (jobId=${jobId}) name=${job.name}, attemptsMade=${job.attemptsMade}`
        )
        // Safety net: if still waiting after 3s, promote/retry
        setTimeout(async () => {
          try {
            const current = await this.matchRoundParticipantTimeoutQueue.getJob(jobId)
            if (!current) return
            const state = await current.getState()
            if (state === 'waiting') {
              this.logger.error(
                `[RoundParticipant Timeout] 🚨 Job ${jobId} still WAITING after 3s, forcing promote/retry`
              )
              try {
                await current.promote()
                this.logger.log(`[RoundParticipant Timeout] ✅ Promoted job ${jobId}`)
              } catch (e) {
                try {
                  await current.retry()
                  this.logger.log(`[RoundParticipant Timeout] ✅ Retried job ${jobId}`)
                } catch (e2) {
                  this.logger.error(
                    `[RoundParticipant Timeout] ❌ Failed to recover job ${jobId}: ${e2?.message}`
                  )
                }
              }
            }
          } catch (err) {
            this.logger.error(
              `[RoundParticipant Timeout] Error during waiting recovery for job ${jobId}`,
              err
            )
          }
        }, 0)
      }
    })
  }

  // Extra visibility for queue state changes

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(
      `[RoundParticipant Timeout] ▶️ (jobId=${job.id}) ACTIVE - Processing mrp=${job.data?.matchRoundParticipantId}`
    )
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(
      `[RoundParticipant Timeout] ✅ (jobId=${job.id}) COMPLETED for mrp=${job.data?.matchRoundParticipantId}`
    )
  }

  @OnQueueFailed()
  onFailed(job: Job, err: any) {
    this.logger.error(
      `[RoundParticipant Timeout] ❌ (jobId=${job?.id}) FAILED for mrp=${job?.data?.matchRoundParticipantId}: ${err?.message}`,
      err?.stack
    )
  }

  // Revert to simple string-based @Process decorator for compatibility with @nestjs/bull v11
  @Process({ name: BullAction.CHECK_POKEMON_SELECTION_TIMEOUT, concurrency: 10 })
  async handlePokemonSelectionTimeout(
    job: Job<{ matchRoundParticipantId: number }>
  ): Promise<void> {
    const { matchRoundParticipantId } = job.data

    this.logger.log(
      `[RoundParticipant Timeout] Processing Pokemon selection timeout for match-round-participant: ${matchRoundParticipantId}, jobId=${job.id}`
    )

    try {
      // Lấy thông tin match-round-participant hiện tại
      const currentParticipant =
        await this.matchRoundParticipantRepo.findWithRoundParticipants(
          matchRoundParticipantId
        )

      if (!currentParticipant) {
        this.logger.warn(`Match-round-participant ${matchRoundParticipantId} not found`)
        return
      }

      // ✅ CRITICAL FIX: Hard check - if already selected, SKIP entirely to prevent duplicate question generation
      if (currentParticipant.selectedUserPokemonId !== null) {
        this.logger.warn(
          `[RoundParticipant Timeout] ⏭️ Participant ${matchRoundParticipantId} already selected Pokemon ${currentParticipant.selectedUserPokemonId}, skipping timeout processing (jobId=${job.id})`
        )
        return
      }

      // Only reach here if Pokemon NOT selected yet
      if (currentParticipant.selectedUserPokemonId === null) {
        // Chưa chọn Pokemon trong thời gian cho phép
        // Auto-select random Pokemon
        const matchParticipant =
          await this.matchRoundParticipantRepo.findMatchParticipant(
            currentParticipant.matchParticipantId
          )

        if (matchParticipant) {
          try {
            this.logger.log(
              `User ${matchParticipant.userId} timeout - Auto-selecting random Pokemon`
            )

            // Lấy match với tất cả rounds để check Pokemon đã chọn
            const match = await this.matchService.findInProgressByParticipant(
              currentParticipant.matchParticipantId
            )

            if (!match) {
              this.logger.warn(
                `No active match found for user ${matchParticipant.userId}`
              )
            } else {
              // Lấy danh sách Pokemon IDs đã chọn trong tất cả rounds
              const selectedPokemonIds = new Set<number>()
              match.rounds.forEach((round) => {
                round.participants.forEach((p) => {
                  if (p.selectedUserPokemon?.pokemonId) {
                    selectedPokemonIds.add(p.selectedUserPokemon.pokemonId)
                  }
                })
              })

              // Lấy danh sách UserPokemon của user này
              const userPokemons = await this.userPokemonService.findPokemonIdsOfUser(
                matchParticipant.userId
              )

              // Lọc ra những Pokemon chưa được chọn (canPick = true)
              const availableUserPokemons = userPokemons.filter(
                (up) => !selectedPokemonIds.has(up.pokemonId)
              )

              if (availableUserPokemons.length > 0) {
                // Chọn ngẫu nhiên 1 UserPokemon
                const randomIndex = Math.floor(
                  Math.random() * availableUserPokemons.length
                )
                const selectedUserPokemon = availableUserPokemons[randomIndex]

                this.logger.log(
                  `Auto-selected UserPokemon ${selectedUserPokemon.id} (Pokemon ${selectedUserPokemon.pokemonId}) for user ${matchParticipant.userId}`
                )

                // Cập nhật selectedUserPokemonId
                await this.matchRoundParticipantRepo.setPickedPending(
                  matchRoundParticipantId,
                  selectedUserPokemon.id
                )

                this.logger.log(
                  `Successfully auto-selected Pokemon for match-round-participant ${matchRoundParticipantId}`
                )

                // Kiểm tra xem có phải participant cuối cùng không
                const allParticipants = currentParticipant.matchRound.participants
                const allSelected = allParticipants.every(
                  (p) =>
                    p.id === matchRoundParticipantId || p.selectedUserPokemonId !== null
                )

                if (allSelected) {
                  this.logger.log(
                    `All participants in round ${currentParticipant.matchRoundId} have selected Pokemon`
                  )

                  // Update MatchRound status to PENDING
                  await this.matchRoundService.setRoundPending(
                    currentParticipant.matchRoundId
                  )

                  // Update all MatchRoundParticipant status to PENDING
                  await this.matchRoundParticipantRepo.setRoundParticipantsPending(
                    currentParticipant.matchRoundId
                  )

                  this.logger.log(
                    `Updated round ${currentParticipant.matchRoundId} and all participants to PENDING status`
                  )
                }
              } else {
                this.logger.warn(
                  `No available Pokemon to auto-select for user ${matchParticipant.userId}`
                )
              }
            }
          } catch (error) {
            this.logger.error(
              `Error auto-selecting Pokemon for user ${matchParticipant.userId}`,
              error
            )
          }
        }

        this.logger.warn(
          `Match-round-participant ${matchRoundParticipantId} timeout without selecting Pokemon`
        )
      }

      // Tìm participant tiếp theo (order cao hơn)
      const nextParticipant = currentParticipant.matchRound.participants.find(
        (p) => p.orderSelected > currentParticipant.orderSelected
      )

      // Track nếu cần generate questions (sau khi gửi socket)
      let shouldGenerateQuestions = false
      let matchIdForGenerate: number | null = null

      if (nextParticipant) {
        // Set time cho participant tiếp theo
        const endTime = addTimeUTC(new Date(), TIME_CHOOSE_POKEMON_MS)
        await this.matchRoundParticipantRepo.setPickDeadline(nextParticipant.id, endTime)

        // Add job ngay lập tức với delay trong Bull (đừng dùng setTimeout)
        const nextJob = await this.matchRoundParticipantTimeoutQueue.add(
          BullAction.CHECK_POKEMON_SELECTION_TIMEOUT,
          {
            matchRoundParticipantId: nextParticipant.id
          },
          {
            delay: TIME_CHOOSE_POKEMON_MS
          }
        )

        this.logger.log(
          `Set endTimeSelected and Bull job for participant: ${nextParticipant.id}, jobId=${nextJob.id}, delay=${TIME_CHOOSE_POKEMON_MS}ms`
        )
      }

      // RE-FETCH participants để có data mới nhất sau khi auto-select
      const freshParticipants = await this.matchRoundParticipantRepo.findPickStateInRound(
        currentParticipant.matchRoundId
      )

      this.logger.log(
        `[Debug] Fresh participants for round ${currentParticipant.matchRoundId}: ${JSON.stringify(freshParticipants)}`
      )

      // Check nếu all selected -> cần generate questions
      const allSelected = freshParticipants.every((p) => p.selectedUserPokemonId !== null)

      this.logger.log(
        `[Debug] allSelected check: ${allSelected} (${freshParticipants.length} participants)`
      )

      if (allSelected) {
        shouldGenerateQuestions = true
        const matchRound = await this.matchRoundService.findMatchIdOfRound(
          currentParticipant.matchRoundId
        )
        if (matchRound) {
          matchIdForGenerate = matchRound.matchId
          this.logger.log(
            `[Debug] Will generate questions for matchId: ${matchIdForGenerate}, roundId: ${currentParticipant.matchRoundId}`
          )
        }
      }

      // Nếu all selected -> generate questions SAU khi đã gửi socket
      if (shouldGenerateQuestions && matchIdForGenerate) {
        this.logger.log(
          `[Debug] Calling generateQuestionsDebuffAndMaybeStartRound for round ${currentParticipant.matchRoundId}`
        )
        await this.roundStart.generateQuestionsAndDebuff(
          currentParticipant.matchRoundId,
          matchIdForGenerate
        )
      } else {
        this.logger.log(
          `[Debug] NOT calling generate: shouldGenerateQuestions=${shouldGenerateQuestions}, matchIdForGenerate=${matchIdForGenerate}`
        )
      }

      // Fetch data và gửi socket 1 lần duy nhất SAU khi tất cả hàm chạy xong (bao gồm moveToNextRound)
      const matchForSocket = await this.matchService.findByRoundWithPlayers(
        currentParticipant.matchRoundId
      )

      if (matchForSocket) {
        const roundsForSocket = await this.matchRoundService.findRoundsWithPicks(
          matchForSocket.id
        )

        const formattedMatch = {
          id: matchForSocket.id,
          status: matchForSocket.status,
          participants: matchForSocket.participants.map((mp: any) => ({
            id: mp.id,
            userId: mp.userId,
            user: {
              id: mp.user.id,
              email: mp.user.email
            }
          }))
        }

        const formattedRounds = roundsForSocket.map((round: any) => ({
          id: round.id,
          roundNumber: round.roundNumber,
          status: round.status,
          endTimeRound: round.endTimeRound,
          participants: round.participants.map((rp: any) => ({
            id: rp.id,
            matchParticipantId: rp.matchParticipantId,
            orderSelected: rp.orderSelected,
            endTimeSelected: rp.endTimeSelected,
            selectedUserPokemonId: rp.selectedUserPokemonId,
            selectedUserPokemon: rp.selectedUserPokemon
              ? {
                  id: rp.selectedUserPokemon.id,
                  userId: rp.selectedUserPokemon.userId,
                  pokemonId: rp.selectedUserPokemon.pokemonId,
                  pokemon: rp.selectedUserPokemon.pokemon
                    ? {
                        id: rp.selectedUserPokemon.pokemon.id,
                        pokedex_number: rp.selectedUserPokemon.pokemon.pokedex_number,
                        nameJp: rp.selectedUserPokemon.pokemon.nameJp,
                        imageUrl: rp.selectedUserPokemon.pokemon.imageUrl,
                        rarity: rp.selectedUserPokemon.pokemon.rarity
                      }
                    : null
                }
              : null
          }))
        }))

        try {
          this.matchingGateway.notifyPokemonSelected(
            matchForSocket.id,
            currentParticipant.matchRoundId,
            {
              match: formattedMatch as any,
              rounds: formattedRounds as any
            },
            matchForSocket.participants[0] as any,
            matchForSocket.participants[1] as any,
            TIME_CHOOSE_POKEMON_MS
          )
          this.logger.log(
            `Socket notification sent after all updates for match ${matchForSocket.id}`
          )
          const matchId = matchForSocket.id
          // If all rounds PENDING, schedule Round ONE to start after 5 seconds
          const allRounds = await this.matchRoundService.findLiveRoundsOfMatch(matchId)
          const allPending = allRounds.every((r) => r.status === 'PENDING')
          if (allPending) {
            const roundOne = allRounds.find((r) => r.roundNumber === 'ONE')
            if (roundOne) {
              // ✅ GUARD: Check if round already IN_PROGRESS to prevent duplicate notifications
              if (roundOne.status === 'IN_PROGRESS') {
                this.logger.warn(
                  `[Round Timeout] Round ONE already IN_PROGRESS for match ${matchId}, skipping notifyRoundStarting`
                )
                return
              }

              // Fetch participants to get userIds for socket notification
              const roundOneParticipants =
                await this.matchRoundParticipantRepo.findInRoundWithUsers(roundOne.id)

              if (roundOneParticipants.length < 2) {
                this.logger.warn(
                  `[Round Timeout] Not enough participants for Round ONE in match ${matchId}`
                )
                return
              }

              const userId1 = roundOneParticipants[0].matchParticipant.userId
              const userId2 = roundOneParticipants[1].matchParticipant.userId

              // Send socket notification: Round ONE will start in 5 seconds
              this.matchingGateway.notifyRoundStarting(
                matchId,
                userId1,
                userId2,
                'ONE',
                5
              )

              // Enqueue Bull job to start Round ONE after 5 seconds
              await this.matchRoundParticipantTimeoutQueue.add(
                BullAction.START_ROUND,
                {
                  matchId,
                  matchRoundId: roundOne.id
                },
                {
                  delay: 5000 // 5 seconds
                }
              )

              this.logger.log(
                `[Round Timeout] Scheduled Round ONE to start in 5 seconds for match ${matchId}`
              )
            }
          }
        } catch (socketError) {
          this.logger.error('Error sending socket notification', socketError)
        }
      }

      // Nếu không có nextParticipant -> chuyển round
      if (!nextParticipant) {
        // Không còn participant nào trong round này
        // Round này đã hoàn thành (tất cả participant đã có lượt)
        this.logger.log(
          `No next participant found - Round ${currentParticipant.matchRound.roundNumber} completed for match ${currentParticipant.matchRound.matchId}`
        )

        // Chuyển sang round tiếp theo
        await this.roundStart.moveToNextRound(currentParticipant.matchRound)
      }
    } catch (error) {
      this.logger.error(
        `Error processing Pokemon selection timeout for match-round-participant ${matchRoundParticipantId}`,
        error
      )
      throw error
    }
  }

  /**
   * Handler to start a round after delay
   */
  @Process({ name: BullAction.START_ROUND, concurrency: 1 })
  async handleStartRound(
    job: Job<{ matchId: number; matchRoundId: number }>
  ): Promise<void> {
    const { matchId, matchRoundId } = job.data

    this.logger.log(
      `[Round Timeout] Starting round for matchRoundId ${matchRoundId}, match ${matchId}, jobId=${job.id}`
    )

    try {
      // ✅ FIX BUG 2: Check if round already IN_PROGRESS to prevent duplicate ROUND_STARTED
      const currentRound = await this.matchRoundService.findRoundStatus(matchRoundId)

      if (currentRound?.status === 'IN_PROGRESS') {
        this.logger.warn(
          `[Round Timeout] Round ${matchRoundId} already IN_PROGRESS, skipping duplicate START_ROUND (jobId=${job.id})`
        )
        return
      }

      // Update MatchRound to IN_PROGRESS
      await this.matchRoundService.startRound(
        matchRoundId,
        addTimeUTC(new Date(), 10 * 60 * 1000)
      )

      // Update all participants to IN_PROGRESS
      await this.matchRoundParticipantRepo.setRoundParticipantsInProgress(matchRoundId)

      // Fetch participants with their first questions
      const roundParticipants =
        await this.matchRoundParticipantRepo.findLiveInRoundForStart(matchRoundId)

      // Schedule first question timeout for each participant and send socket
      let participantIndex = 0
      for (const participant of roundParticipants) {
        const firstQuestion = await this.roundQuestionService.findFirstQuestion(
          participant.id
        )

        if (!firstQuestion) {
          this.logger.warn(
            `[Round Timeout] Participant ${participant.id} has no questions for matchRoundId ${matchRoundId}`
          )
          continue
        }

        // Set endTimeQuestion
        const endTimeQuestion = addTimeUTC(new Date(), firstQuestion.timeLimitMs)
        await this.roundQuestionService.setQuestionEndTime(
          firstQuestion.id,
          endTimeQuestion
        )

        // CRITICAL: Use setTimeout instead of Bull queue to avoid race condition
        // Bull v4 auto-deletes concurrent jobs, so we bypass it entirely
        const delayOffset = (participant.id % 2) * 250

        setTimeout(async () => {
          try {
            await this.roundQuestionProcessor.handleQuestionTimeout({
              id: `first-${firstQuestion.id}`,
              data: {
                roundQuestionId: firstQuestion.id,
                matchRoundParticipantId: participant.id
              }
            } as any)
          } catch (err) {
            this.logger.error(
              `[Round Timeout] setTimeout error for first question ${firstQuestion.id}: ${err.message}`
            )
          }
        }, firstQuestion.timeLimitMs + delayOffset)

        this.logger.log(
          `[Round Timeout] 📋 Scheduled first question ${firstQuestion.id} for participant ${participant.id} (user ${participant.matchParticipant.user.id}) - setTimeout delay=${firstQuestion.timeLimitMs + delayOffset}ms, offset=${delayOffset}ms`
        )

        // Send socket to user with round data, participant info, and first question (formatted via QuestionBankService)
        const userId = participant.matchParticipant.userId
        const userLang = this.socketServerService.getLangByUserId(userId)
        this.logger.log(
          `[Round Timeout] 🎯 handleStartRound - userId=${userId}, userLang=${userLang}, questionBankId=${firstQuestion.questionBankId}`
        )
        let firstQuestionForNotify: any | null = null
        try {
          const qbList = await this.questionBankService.getByIds(
            [firstQuestion.questionBankId],
            userLang
          )
          firstQuestionForNotify = qbList?.[0] || null
          this.logger.log(
            `[Round Timeout] ✅ handleStartRound - userId=${userId}, qbList.length=${qbList?.length}, hasQuestion=${!!firstQuestionForNotify}, lang=${userLang}`
          )
          // Always include debuff field (null if none)
          if (firstQuestionForNotify) {
            firstQuestionForNotify.debuff = firstQuestion.debuff || null
            // Include roundQuestionId so FE can reference it
            firstQuestionForNotify.roundQuestionId = firstQuestion.id
            // ✅ THÊM: timeLimitMs
            firstQuestionForNotify.timeLimitMs = firstQuestion.timeLimitMs
          }
        } catch (err) {
          this.logger.warn(
            `[Round Timeout] Failed to fetch formatted questionBank for firstQuestion ${firstQuestion.id}: ${err?.message}`
          )
          firstQuestionForNotify = null
        }

        // Find opponent participant
        const opponentParticipant = roundParticipants.find(
          (p) => p.matchParticipant.userId !== userId
        )

        this.matchingGateway.notifyRoundStarted(
          matchId,
          userId,
          {
            id: matchRoundId,
            roundNumber: participant.matchRound.roundNumber,
            status: 'IN_PROGRESS',
            participant: {
              id: participant.id,
              status: participant.status,
              selectedUserPokemon: participant.selectedUserPokemon,
              debuff: participant.debuff || null
            },
            opponent: opponentParticipant
              ? {
                  id: opponentParticipant.id,
                  status: opponentParticipant.status,
                  selectedUserPokemon: opponentParticipant.selectedUserPokemon,
                  debuff: opponentParticipant.debuff || null,
                  user: {
                    id: opponentParticipant.matchParticipant.user.id,
                    name: opponentParticipant.matchParticipant.user.name,
                    avatar: opponentParticipant.matchParticipant.user.avatar
                  }
                }
              : null
          },
          {
            ...firstQuestionForNotify,
            endTimeQuestion,
            timeLimitMs: firstQuestion.timeLimitMs
          }
        )

        this.logger.log(
          `[Round Timeout] Started round ${participant.matchRound.roundNumber} for participant ${participant.id} (user ${userId}) with first question ${firstQuestion.id}`
        )
      }

      this.logger.log(
        `[Round Timeout] Round started for match ${matchId}, matchRoundId ${matchRoundId}`
      )
    } catch (error) {
      this.logger.error(
        `[Round Timeout] Error starting round for match ${matchId}, matchRoundId ${matchRoundId}`,
        error
      )
      throw error
    }
  }
}
