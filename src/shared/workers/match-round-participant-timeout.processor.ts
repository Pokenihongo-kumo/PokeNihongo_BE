import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import {
  MatchRoundNumber,
  MatchRoundParticipantStatus,
  RoundStatus
} from '@/common/constants/match.constant'
import { PokemonRepo } from '@/modules/pokemon/pokemon.repo'
import { QuestionBankRepo } from '@/modules/question-bank/question-bank.repo'
import { addTimeUTC, convertEloToRank } from '@/shared/helpers'
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
import { forwardRef, Inject, Logger, OnModuleInit } from '@nestjs/common'
import { Job, Queue } from 'bull'
import { RoundQuestionTimeoutProcessor } from './round-question-timeout.processor'

const TIME_CHOOSE_POKEMON_MS = 5000
const TIME_LIMIT_ANSWER_QUESTION_MS = 5000
const QUESTIONS_PER_ROUND = 5

@Processor(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
export class MatchRoundParticipantTimeoutProcessor implements OnModuleInit {
  private readonly logger = new Logger(MatchRoundParticipantTimeoutProcessor.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly questionBankRepo: QuestionBankRepo,
    private readonly pokemonRepo: PokemonRepo,
    @InjectQueue(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
    private readonly matchRoundParticipantTimeoutQueue: Queue,
    @InjectQueue(BullQueue.ROUND_QUESTION_TIMEOUT)
    private readonly roundQuestionTimeoutQueue: Queue,
    @Inject(MatchingGateway)
    private readonly matchingGateway: MatchingGateway,
    @Inject(forwardRef(() => RoundQuestionTimeoutProcessor))
    private readonly roundQuestionProcessor: RoundQuestionTimeoutProcessor,
    private readonly socketServerService: SocketServerService
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
        await this.prismaService.matchRoundParticipant.findUnique({
          where: { id: matchRoundParticipantId },
          include: {
            matchRound: {
              include: {
                participants: {
                  orderBy: {
                    orderSelected: 'asc'
                  }
                }
              }
            }
          }
        })

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
        const matchParticipant = await this.prismaService.matchParticipant.findUnique({
          where: { id: currentParticipant.matchParticipantId }
        })

        if (matchParticipant) {
          try {
            this.logger.log(
              `User ${matchParticipant.userId} timeout - Auto-selecting random Pokemon`
            )

            // Lấy match với tất cả rounds để check Pokemon đã chọn
            const match = await this.prismaService.match.findFirst({
              where: {
                participants: {
                  some: { id: currentParticipant.matchParticipantId }
                },
                status: 'IN_PROGRESS'
              },
              include: {
                rounds: {
                  include: {
                    participants: {
                      select: {
                        selectedUserPokemonId: true,
                        selectedUserPokemon: {
                          select: {
                            pokemonId: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            })

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
              const userPokemons = await this.prismaService.userPokemon.findMany({
                where: { userId: matchParticipant.userId },
                select: {
                  id: true,
                  pokemonId: true
                }
              })

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
                await this.prismaService.matchRoundParticipant.update({
                  where: { id: matchRoundParticipantId },
                  data: {
                    selectedUserPokemonId: selectedUserPokemon.id,
                    status: MatchRoundParticipantStatus.PENDING
                  }
                })

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
                  await this.prismaService.matchRound.update({
                    where: { id: currentParticipant.matchRoundId },
                    data: { status: RoundStatus.PENDING }
                  })

                  // Update all MatchRoundParticipant status to PENDING
                  await this.prismaService.matchRoundParticipant.updateMany({
                    where: { matchRoundId: currentParticipant.matchRoundId },
                    data: { status: RoundStatus.PENDING }
                  })

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
        await this.prismaService.matchRoundParticipant.update({
          where: { id: nextParticipant.id },
          data: {
            endTimeSelected: endTime
          }
        })

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
      const freshParticipants = await this.prismaService.matchRoundParticipant.findMany({
        where: { matchRoundId: currentParticipant.matchRoundId },
        select: { id: true, selectedUserPokemonId: true }
      })

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
        const matchRound = await this.prismaService.matchRound.findUnique({
          where: { id: currentParticipant.matchRoundId },
          select: { matchId: true }
        })
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
        await this.generateQuestionsDebuffAndMaybeStartRound(
          currentParticipant.matchRoundId,
          matchIdForGenerate
        )
      } else {
        this.logger.log(
          `[Debug] NOT calling generate: shouldGenerateQuestions=${shouldGenerateQuestions}, matchIdForGenerate=${matchIdForGenerate}`
        )
      }

      // Fetch data và gửi socket 1 lần duy nhất SAU khi tất cả hàm chạy xong (bao gồm moveToNextRound)
      const matchForSocket = await this.prismaService.match.findFirst({
        where: {
          rounds: {
            some: { id: currentParticipant.matchRoundId }
          }
        },
        include: {
          participants: {
            include: { user: true }
          }
        }
      })

      if (matchForSocket) {
        const roundsForSocket = await this.prismaService.matchRound.findMany({
          where: { matchId: matchForSocket.id, deletedAt: null },
          include: {
            participants: {
              include: {
                selectedUserPokemon: { include: { pokemon: true } }
              }
            }
          },
          orderBy: { roundNumber: 'asc' }
        })

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
          const allRounds = await this.prismaService.matchRound.findMany({
            where: { matchId, deletedAt: null }
          })
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
                await this.prismaService.matchRoundParticipant.findMany({
                  where: { matchRoundId: roundOne.id, deletedAt: null },
                  include: {
                    matchParticipant: {
                      include: {
                        user: true
                      }
                    }
                  },
                  orderBy: { orderSelected: 'asc' }
                })

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
        await this.moveToNextRound(currentParticipant.matchRound)
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
   * Chuyển sang round tiếp theo khi round hiện tại đã hoàn thành
   */
  private async moveToNextRound(currentMatchRound: any): Promise<void> {
    try {
      // Cập nhật status của round hiện tại thành PENDING
      await this.prismaService.matchRound.update({
        where: { id: currentMatchRound.id },
        data: {
          status: RoundStatus.PENDING
        }
      })

      const nextRoundMap = {
        [MatchRoundNumber.ONE]: MatchRoundNumber.TWO,
        [MatchRoundNumber.TWO]: MatchRoundNumber.THREE,
        [MatchRoundNumber.THREE]: null
      }

      const nextRoundNumber = nextRoundMap[currentMatchRound.roundNumber]

      if (!nextRoundNumber) {
        this.logger.log(
          `Match ${currentMatchRound.matchId} has completed all rounds (Round THREE finished)`
        )
        return
      }

      // Tìm round tiếp theo
      const nextRound = await this.prismaService.matchRound.findFirst({
        where: {
          matchId: currentMatchRound.matchId,
          roundNumber: nextRoundNumber,
          deletedAt: null
        },
        include: {
          participants: {
            orderBy: {
              orderSelected: 'asc'
            }
          }
        }
      })

      if (!nextRound) {
        this.logger.warn(
          `Next round ${nextRoundNumber} not found for match ${currentMatchRound.matchId}`
        )
        return
      }

      // Lấy participant đầu tiên của round tiếp theo
      const firstParticipant = nextRound.participants[0]

      if (firstParticipant) {
        // Set endTimeSelected
        await this.prismaService.matchRoundParticipant.update({
          where: { id: firstParticipant.id },
          data: {
            endTimeSelected: addTimeUTC(new Date(), TIME_CHOOSE_POKEMON_MS)
          }
        })

        // Tạo Bull job
        await this.matchRoundParticipantTimeoutQueue.add(
          BullAction.CHECK_POKEMON_SELECTION_TIMEOUT,
          {
            matchRoundParticipantId: firstParticipant.id
          },
          {
            delay: TIME_CHOOSE_POKEMON_MS
          }
        )

        this.logger.log(
          `Moved to round ${nextRoundNumber} - Set endTime and Bull job for participant ${firstParticipant.id}`
        )
      }
    } catch (error) {
      this.logger.error(
        `Error moving to next round for match ${currentMatchRound.matchId}`,
        error
      )
    }
  }

  /**
   * After all selections are done in a round: create 10 identical questions for both participants,
   * apply one debuff to one participant, and if all rounds are PENDING then start Round ONE.
   */
  private async generateQuestionsDebuffAndMaybeStartRound(
    matchRoundId: number,
    matchId: number
  ): Promise<void> {
    try {
      // Get participants of this round
      const participants = await this.prismaService.matchRoundParticipant.findMany({
        where: { matchRoundId, deletedAt: null },
        include: {
          selectedUserPokemon: { select: { pokemonId: true } },
          matchRound: true
        },
        orderBy: { orderSelected: 'asc' }
      })

      if (participants.length < 2) return

      // Guard: if questions already exist, skip
      const existingCount = await this.prismaService.roundQuestion.count({
        where: { matchRoundParticipantId: { in: participants.map((p) => p.id) } }
      })
      if (existingCount > 0) {
        this.logger.debug(
          `[Round Timeout] Questions already exist for round ${matchRoundId}, skip generation`
        )
        return
      }

      // Fetch match participants to get userIds and elos
      const matchParticipants = await this.prismaService.matchParticipant.findMany({
        where: { matchId, deletedAt: null },
        select: { id: true, userId: true }
      })
      const users = await this.prismaService.user.findMany({
        where: { id: { in: matchParticipants.map((m) => m.userId) } },
        select: { id: true, eloscore: true }
      })
      const eloMap = new Map(users.map((u) => [u.id, u.eloscore || 0]))
      const avgElo = users.reduce((sum, u) => sum + (u.eloscore || 0), 0) / users.length

      // Determine ranks present
      const ranks = matchParticipants.map((mp) =>
        convertEloToRank(eloMap.get(mp.userId) || 0)
      )
      const distinctRanks = Array.from(new Set(ranks)).filter(
        (r) => r && r !== 'Unranked'
      ) as string[]
      const sortedRanks = distinctRanks.sort()
      const baseRank: string | undefined = sortedRanks[0]
      const higherRank: string | null = sortedRanks.length > 1 ? sortedRanks[1] : null

      // Compute higher percentage if rank differs
      let higherPercent = 0
      if (higherRank) {
        const rankThresholds = [
          { rank: 'N5', maxElo: 1000 },
          { rank: 'N4', maxElo: 2000 },
          { rank: 'N3', maxElo: 3000 }
        ]
        const lowMax = rankThresholds.find((t) => t.rank === baseRank)?.maxElo || 0
        const diff = Math.max(0, avgElo - lowMax)
        const rawPercent = Math.floor(diff / 10) // e.g., 277 -> 27
        higherPercent = Math.min(50, Math.max(10, Math.floor(rawPercent / 10) * 10))
      }

      const totalQuestions = QUESTIONS_PER_ROUND
      const higherCount = higherRank
        ? Math.round((totalQuestions * higherPercent) / 100)
        : 0
      const baseCount = totalQuestions - higherCount

      const rankToLevel = (rank?: string | null): number | undefined => {
        if (!rank) return undefined
        if (rank.startsWith('N')) {
          const n = parseInt(rank.substring(1), 10)
          return isNaN(n) ? undefined : n
        }
        return undefined
      }

      // Use QuestionBankRepo to fetch random questions
      const baseLevelN = rankToLevel(baseRank)
      const finalBase = baseLevelN
        ? await this.questionBankRepo.getRandomQuestions(
            Math.max(0, baseCount),
            baseLevelN
          )
        : []

      let finalHigher: any[] = []
      if (higherCount > 0 && higherRank) {
        const higherLevelN = rankToLevel(higherRank)
        if (higherLevelN) {
          finalHigher = await this.questionBankRepo.getRandomQuestions(
            higherCount,
            higherLevelN
          )
        }
      }

      const combined = [...finalBase, ...finalHigher].sort(() => Math.random() - 0.5)

      // Create identical set for each participant
      for (const p of participants) {
        let orderNumber = 1
        for (const q of combined) {
          await this.prismaService.roundQuestion.create({
            data: {
              matchRoundParticipantId: p.id,
              questionBankId: q.id,
              timeLimitMs: TIME_LIMIT_ANSWER_QUESTION_MS,
              basePoints: 100,
              orderNumber
            }
          })
          orderNumber++
        }
      }

      await this.prismaService.matchRoundParticipant.updateMany({
        where: { id: { in: participants.map((p) => p.id) } },
        data: { questionsTotal: combined.length }
      })

      // Debuff: calculate which participant should receive debuff using Pokemon comparison
      try {
        const debuffs = await this.prismaService.debuffRound.findMany({
          where: { deletedAt: null },
          take: 50
        })
        const debuffRow = debuffs.length
          ? debuffs[Math.floor(Math.random() * debuffs.length)]
          : null

        if (debuffRow && participants.length === 2) {
          const [p1, p2] = participants
          let debuffedParticipantId: number | null = null

          // Calculate which Pokemon is debuffed
          if (p1.selectedUserPokemon?.pokemonId && p2.selectedUserPokemon?.pokemonId) {
            try {
              const debuffCalc = await this.pokemonRepo.calculateDebuffedPokemon(
                p1.selectedUserPokemon.pokemonId,
                p2.selectedUserPokemon.pokemonId
              )
              const debuffedPokemonId = debuffCalc.debuffedPokemonId

              if (p1.selectedUserPokemon.pokemonId === debuffedPokemonId) {
                debuffedParticipantId = p1.id
              } else if (p2.selectedUserPokemon.pokemonId === debuffedPokemonId) {
                debuffedParticipantId = p2.id
              }
            } catch (calcError) {
              this.logger.warn(
                `[Round Timeout] Failed to calculate debuff: ${calcError?.message}`
              )
              // Fallback to first participant
              debuffedParticipantId = participants[0].id
            }
          }

          if (!debuffedParticipantId) {
            debuffedParticipantId = participants[0].id
          }

          // Persist debuff assignment on the participant itself for consistent later includes
          try {
            if (debuffRow && debuffedParticipantId) {
              await this.prismaService.matchRoundParticipant.update({
                where: { id: debuffedParticipantId },
                data: { debuffId: debuffRow.id, questionsTotal: QUESTIONS_PER_ROUND }
              })
            }
          } catch (assignErr) {
            this.logger.warn(
              `[Round Timeout] Failed to assign debuffId=${debuffRow?.id} to participant ${debuffedParticipantId}: ${assignErr?.message}`
            )
          }

          const questionsOfDebuffed = await this.prismaService.roundQuestion.findMany({
            where: { matchRoundParticipantId: debuffedParticipantId },
            orderBy: { orderNumber: 'asc' }
          })

          if (questionsOfDebuffed.length > 0) {
            if (debuffRow.typeDebuff === 'ADD_QUESTION') {
              const extraRank = higherRank || baseRank
              const extraLevelN = rankToLevel(extraRank)
              if (extraLevelN) {
                const extraPool = await this.questionBankRepo.getRandomQuestions(
                  debuffRow.valueDebuff || 1,
                  extraLevelN
                )
                let nextOrder = questionsOfDebuffed.length + 1
                for (const extra of extraPool) {
                  await this.prismaService.roundQuestion.create({
                    data: {
                      matchRoundParticipantId: debuffedParticipantId,
                      questionBankId: extra.id,
                      timeLimitMs: TIME_LIMIT_ANSWER_QUESTION_MS,
                      basePoints: 100,
                      orderNumber: nextOrder++,
                      debuffId: debuffRow.id
                    }
                  })
                }
                // Increment questionsTotal for the debuffed participant so completion logic stays accurate
                const incrementBy = debuffRow.valueDebuff || 1
                await this.prismaService.matchRoundParticipant.update({
                  where: { id: debuffedParticipantId },
                  data: {
                    questionsTotal: {
                      increment: incrementBy
                    }
                  }
                })
                this.logger.log(
                  `[Round Timeout] ADD_QUESTION debuff applied: +${incrementBy} questions to participant ${debuffedParticipantId}`
                )
              }
            } else if (debuffRow.typeDebuff === 'DECREASE_POINT') {
              const target =
                questionsOfDebuffed[
                  Math.floor(Math.random() * questionsOfDebuffed.length)
                ]
              await this.prismaService.roundQuestion.update({
                where: { id: target.id },
                data: {
                  debuffId: debuffRow.id,
                  basePoints: Math.max(
                    10,
                    target.basePoints - (debuffRow.valueDebuff || 0)
                  )
                }
              })
            } else if (debuffRow.typeDebuff === 'DISCOMFORT_VISION') {
              const target =
                questionsOfDebuffed[
                  Math.floor(Math.random() * questionsOfDebuffed.length)
                ]
              await this.prismaService.roundQuestion.update({
                where: { id: target.id },
                data: { debuffId: debuffRow.id }
              })
            }
          }
        }
      } catch (e) {
        this.logger.warn(`[Round Timeout] Debuff application failed: ${e?.message}`)
      }
    } catch (err) {
      this.logger.error(
        `[Round Timeout] Error generating questions/debuff for round ${matchRoundId}: ${err?.message}`
      )
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
      const currentRound = await this.prismaService.matchRound.findUnique({
        where: { id: matchRoundId },
        select: { status: true }
      })

      if (currentRound?.status === 'IN_PROGRESS') {
        this.logger.warn(
          `[Round Timeout] Round ${matchRoundId} already IN_PROGRESS, skipping duplicate START_ROUND (jobId=${job.id})`
        )
        return
      }

      // Update MatchRound to IN_PROGRESS
      await this.prismaService.matchRound.update({
        where: { id: matchRoundId },
        data: {
          status: 'IN_PROGRESS',
          endTimeRound: addTimeUTC(new Date(), 10 * 60 * 1000) // 10 minutes
        }
      })

      // Update all participants to IN_PROGRESS
      await this.prismaService.matchRoundParticipant.updateMany({
        where: { matchRoundId: matchRoundId },
        data: { status: 'IN_PROGRESS' }
      })

      // Fetch participants with their first questions
      const roundParticipants = await this.prismaService.matchRoundParticipant.findMany({
        where: { matchRoundId: matchRoundId, deletedAt: null },
        include: {
          matchParticipant: {
            include: {
              user: true
            }
          },
          matchRound: true,
          selectedUserPokemon: {
            include: {
              pokemon: true
            }
          },
          debuff: true
        },
        orderBy: { orderSelected: 'asc' }
      })

      // Schedule first question timeout for each participant and send socket
      let participantIndex = 0
      for (const participant of roundParticipants) {
        const firstQuestion = await this.prismaService.roundQuestion.findFirst({
          where: { matchRoundParticipantId: participant.id },
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

        if (!firstQuestion) {
          this.logger.warn(
            `[Round Timeout] Participant ${participant.id} has no questions for matchRoundId ${matchRoundId}`
          )
          continue
        }

        // Set endTimeQuestion
        const endTimeQuestion = addTimeUTC(new Date(), firstQuestion.timeLimitMs)
        await this.prismaService.roundQuestion.update({
          where: { id: firstQuestion.id },
          data: { endTimeQuestion }
        })

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
          const qbList = await this.questionBankRepo.findByIds(
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
