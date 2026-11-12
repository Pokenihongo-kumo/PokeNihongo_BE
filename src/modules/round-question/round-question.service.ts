import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { I18nService } from '@/i18n/i18n.service'
import { RoundQuestionMessage } from '@/i18n/message-keys'
import { QuestionBankRepo } from '@/modules/question-bank/question-bank.repo'
import { NotFoundRecordException } from '@/shared/error'
import {
  addTimeUTC,
  calculateEloGain,
  calculateEloLoss,
  convertEloToRank,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { PrismaService } from '@/shared/services/prisma.service'
import { RoundQuestionTimeoutProcessor } from '@/shared/workers/round-question-timeout.processor'
import { MatchingGateway } from '@/websockets/matching.gateway'
import { InjectQueue } from '@nestjs/bull'
import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { Queue } from 'bull'
import { RoundQuestionNotFoundException } from './dto/round-question.error'
import {
  AnswerQuestionBodyType,
  CreateRoundQuestionBodyType,
  UpdateRoundQuestionBodyType
} from './entities/round-question.entity'
import { RoundQuestionRepo } from './round-question.repo'

@Injectable()
export class RoundQuestionService {
  constructor(
    private roundQuestionRepo: RoundQuestionRepo,
    private readonly i18nService: I18nService,
    private readonly prismaService: PrismaService,
    private readonly matchingGateway: MatchingGateway,
    private readonly questionBankRepo: QuestionBankRepo,
    @InjectQueue(BullQueue.ROUND_QUESTION_TIMEOUT)
    private readonly roundQuestionTimeoutQueue: Queue,
    @InjectQueue(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
    private readonly matchRoundParticipantTimeoutQueue: Queue,
    @Inject(forwardRef(() => RoundQuestionTimeoutProcessor))
    private readonly roundQuestionProcessor: RoundQuestionTimeoutProcessor
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.roundQuestionRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(RoundQuestionMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const roundQuestion = await this.roundQuestionRepo.findById(id)
    if (!roundQuestion) {
      throw new RoundQuestionNotFoundException()
    }

    return {
      statusCode: 200,
      data: roundQuestion,
      message: this.i18nService.translate(RoundQuestionMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateRoundQuestionBodyType },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.roundQuestionRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(RoundQuestionMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async update(
    {
      id,
      data,
      userId
    }: {
      id: number
      data: UpdateRoundQuestionBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const roundQuestion = await this.roundQuestionRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: roundQuestion,
        message: this.i18nService.translate(RoundQuestionMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new RoundQuestionNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existRoundQuestion = await this.roundQuestionRepo.findById(id)
      if (!existRoundQuestion) {
        throw new RoundQuestionNotFoundException()
      }

      await this.roundQuestionRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(RoundQuestionMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new RoundQuestionNotFoundException()
      }
      throw error
    }
  }

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

  async answerQuestion(
    {
      id,
      data,
      userId
    }: {
      id: number
      data: AnswerQuestionBodyType
      userId: number
    },
    lang: string = 'vi'
  ) {
    // Fetch roundQuestion first to get matchRoundParticipantId
    const roundQuestion = await this.prismaService.roundQuestion.findUnique({
      where: { id },
      include: {
        questionBank: { include: { answers: true } },
        debuff: true
      }
    })

    if (!roundQuestion) throw new RoundQuestionNotFoundException()

    // ✅ CRITICAL: Clear setTimeout FIRST (processor might be about to fire)
    this.roundQuestionProcessor.clearQuestionTimeout(
      id,
      roundQuestion.matchRoundParticipantId
    )

    // ✅ CRITICAL: Remove ALL Bull jobs (including active ones) for current question
    try {
      const jobs = await this.roundQuestionTimeoutQueue.getJobs([
        'delayed',
        'waiting',
        'active'
      ])
      const jobsToRemove = jobs.filter(
        (j) =>
          j.name === BullAction.CHECK_QUESTION_TIMEOUT &&
          j.data?.roundQuestionId === id &&
          j.data?.matchRoundParticipantId === roundQuestion.matchRoundParticipantId
      )

      if (jobsToRemove.length > 0) {
        console.log(
          `[RoundQuestion] 🗑️ Removing ${jobsToRemove.length} timeout job(s) for roundQuestionId=${id}, participantId=${roundQuestion.matchRoundParticipantId}: jobIds=[${jobsToRemove.map((j) => j.id).join(', ')}]`
        )
      }

      await Promise.all(jobsToRemove.map((j) => j.remove()))
    } catch (e) {
      console.warn('[RoundQuestion] Failed to remove timeout job', e)
    }

    // Check provided answer
    const providedAnswer = roundQuestion.questionBank.answers.find(
      (a) => a.id === data.answerId
    )
    const isCorrect = !!providedAnswer && providedAnswer.isCorrect

    const pointsEarned = this.calculatePointsEarned(
      isCorrect,
      roundQuestion.basePoints,
      data.timeAnswerMs,
      roundQuestion.timeLimitMs,
      roundQuestion.debuff
    )

    // Upsert answer log
    const existingAnswerLog = await this.prismaService.roundQuestionsAnswerLog.findFirst({
      where: { roundQuestionId: id }
    })

    let finalAnswerLog: any = existingAnswerLog
    if (existingAnswerLog) {
      finalAnswerLog = await this.prismaService.roundQuestionsAnswerLog.update({
        where: { id: existingAnswerLog.id },
        data: {
          answerId: data.answerId,
          timeAnswerMs: data.timeAnswerMs,
          isCorrect,
          pointsEarned
        }
      })
    } else {
      finalAnswerLog = await this.prismaService.roundQuestionsAnswerLog.create({
        data: {
          roundQuestionId: id,
          answerId: data.answerId,
          timeAnswerMs: data.timeAnswerMs,
          isCorrect,
          pointsEarned
        }
      })
    }

    // Find participant/match info and determine next question BEFORE notifying
    const matchRoundParticipant =
      await this.prismaService.matchRoundParticipant.findUnique({
        where: { id: roundQuestion.matchRoundParticipantId },
        include: {
          matchParticipant: { include: { user: true } },
          matchRound: {
            include: { match: { include: { participants: { include: { user: true } } } } }
          }
        }
      })
    let endTimeQuestion: Date | null = null

    // Determine and schedule next question (if any) so we can include it in the socket payload
    let nextQuestion: any | null = null
    try {
      if (matchRoundParticipant) {
        nextQuestion = await this.prismaService.roundQuestion.findFirst({
          where: {
            matchRoundParticipantId: roundQuestion.matchRoundParticipantId,
            orderNumber: { gt: roundQuestion.orderNumber }
          },
          orderBy: { orderNumber: 'asc' },
          include: {
            questionBank: { include: { answers: true } },
            debuff: true
          }
        })

        if (nextQuestion) {
          // CRITICAL: Clear any pending setTimeout for next question
          // This prevents double-firing when user answers current question early
          this.roundQuestionProcessor.clearQuestionTimeout(
            nextQuestion.id,
            roundQuestion.matchRoundParticipantId
          )

          endTimeQuestion = addTimeUTC(new Date(), nextQuestion.timeLimitMs)
          await this.prismaService.roundQuestion.update({
            where: { id: nextQuestion.id },
            data: { endTimeQuestion }
          })

          // Offset + priority for concurrent processing
          const delayOffset = (roundQuestion.matchRoundParticipantId % 2) * 250
          const priority = roundQuestion.matchRoundParticipantId % 2 === 0 ? 1 : 2

          await this.roundQuestionTimeoutQueue.add(
            BullAction.CHECK_QUESTION_TIMEOUT,
            {
              roundQuestionId: nextQuestion.id,
              matchRoundParticipantId: roundQuestion.matchRoundParticipantId
            },
            {
              delay: nextQuestion.timeLimitMs + delayOffset,
              priority,
              removeOnComplete: false,
              removeOnFail: false
            }
          )
        }
      }
    } catch (e) {
      console.warn('[RoundQuestion] Failed to schedule next question timeout', e)
      // keep going even if scheduling fails - we'll still notify the answer result
    }

    // Prepare formatted nextQuestion for notification (use repository to avoid DI cycles)
    let nextQuestionForNotify: any | null = null
    if (nextQuestion) {
      try {
        const qbList = await this.questionBankRepo.findByIds(
          [nextQuestion.questionBankId],
          lang
        )
        nextQuestionForNotify = qbList?.[0] || null
        // Always include debuff field (null if none)
        if (nextQuestionForNotify) {
          nextQuestionForNotify.debuff = nextQuestion.debuff || null
          // Include roundQuestionId so FE can reference it
          nextQuestionForNotify.roundQuestionId = nextQuestion.id
          // ✅ THÊM: timeLimitMs và endTimeQuestion
          nextQuestionForNotify.timeLimitMs = nextQuestion.timeLimitMs
          nextQuestionForNotify.endTimeQuestion = endTimeQuestion?.toISOString() || null
        }
      } catch (err) {
        console.warn(
          '[RoundQuestion] Failed to fetch formatted questionBank for nextQuestion',
          err
        )
        nextQuestionForNotify = null
      }
    }

    // Notify answered including nextQuestion (null when last question)
    if (finalAnswerLog) {
      const currentUserId = matchRoundParticipant?.matchParticipant.userId
      const matchId = matchRoundParticipant?.matchRound?.match?.id
      if (matchId && currentUserId) {
        this.matchingGateway.notifyQuestionAnswered(
          matchId,
          currentUserId,
          {
            roundQuestionId: id,
            answerId: finalAnswerLog.answerId,
            isCorrect: finalAnswerLog.isCorrect,
            pointsEarned: finalAnswerLog.pointsEarned || 0,
            timeAnswerMs: finalAnswerLog.timeAnswerMs
          },
          nextQuestionForNotify
            ? {
                nextQuestion: {
                  ...nextQuestionForNotify,
                  timeLimitMs: nextQuestionForNotify.timeLimitMs,
                  endTimeQuestion: endTimeQuestion
                }
              }
            : null
        )
      }
    }

    // If last question, finalize participant and possibly complete round
    const isLastQuestion =
      roundQuestion.orderNumber >= (matchRoundParticipant?.questionsTotal || 0)

    // If not last question, schedule next question timeout like processor does
    if (!isLastQuestion) {
      try {
        const nextQuestion = await this.prismaService.roundQuestion.findFirst({
          where: {
            matchRoundParticipantId: roundQuestion.matchRoundParticipantId,
            orderNumber: { gt: roundQuestion.orderNumber }
          },
          orderBy: { orderNumber: 'asc' },
          include: {
            questionBank: { include: { answers: true } }
          }
        })

        if (nextQuestion) {
          // ✅ CRITICAL: Clear any pending setTimeout from processor to prevent double-firing
          this.roundQuestionProcessor.clearQuestionTimeout(
            nextQuestion.id,
            roundQuestion.matchRoundParticipantId
          )

          // ✅ CRITICAL: Remove any existing Bull jobs for next question to prevent duplicates
          const existingJobs = await this.roundQuestionTimeoutQueue.getJobs([
            'waiting',
            'delayed',
            'active'
          ])
          const duplicateJobs = existingJobs.filter(
            (j) =>
              j.name === BullAction.CHECK_QUESTION_TIMEOUT &&
              j.data?.roundQuestionId === nextQuestion.id &&
              j.data?.matchRoundParticipantId === roundQuestion.matchRoundParticipantId
          )

          if (duplicateJobs.length > 0) {
            console.log(
              `[RoundQuestion] 🗑️ Found ${duplicateJobs.length} existing job(s) for next question ${nextQuestion.id}, removing them`
            )
            await Promise.all(duplicateJobs.map((j) => j.remove()))
          }

          const endTimeQuestion = addTimeUTC(new Date(), nextQuestion.timeLimitMs)
          await this.prismaService.roundQuestion.update({
            where: { id: nextQuestion.id },
            data: { endTimeQuestion }
          })

          // Offset + priority for concurrent processing
          const delayOffset = (roundQuestion.matchRoundParticipantId % 2) * 250
          const priority = roundQuestion.matchRoundParticipantId % 2 === 0 ? 1 : 2

          await this.roundQuestionTimeoutQueue.add(
            BullAction.CHECK_QUESTION_TIMEOUT,
            {
              roundQuestionId: nextQuestion.id,
              matchRoundParticipantId: roundQuestion.matchRoundParticipantId
            },
            {
              delay: nextQuestion.timeLimitMs + delayOffset,
              priority,
              removeOnComplete: false,
              removeOnFail: false
            }
          )
        }
      } catch (e) {
        console.warn('[RoundQuestion] Failed to schedule next question timeout', e)
      }
    }

    if (isLastQuestion) {
      // Calculate totals
      const allAnswerLogs = await this.prismaService.roundQuestionsAnswerLog.findMany({
        where: {
          roundQuestion: {
            matchRoundParticipantId: roundQuestion.matchRoundParticipantId
          }
        }
      })

      const totalTimeMs = allAnswerLogs.reduce((sum, l) => sum + (l.timeAnswerMs || 0), 0)
      const points = allAnswerLogs.reduce((sum, l) => sum + (l.pointsEarned || 0), 0)

      const updatedParticipant = await this.prismaService.matchRoundParticipant.update({
        where: { id: roundQuestion.matchRoundParticipantId },
        data: { totalTimeMs, points, status: 'COMPLETED' },
        include: { selectedUserPokemon: { include: { pokemon: true } }, debuff: true }
      })

      // Notify completion and opponent
      const opponentMatchParticipant =
        matchRoundParticipant?.matchRound?.match?.participants.find(
          (p) => p.userId !== matchRoundParticipant?.matchParticipant?.userId
        )
      if (matchRoundParticipant && opponentMatchParticipant) {
        this.matchingGateway.notifyQuestionCompleted(
          matchRoundParticipant.matchRound.match.id,
          matchRoundParticipant.matchParticipant.userId,
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
            matchRoundParticipant.matchRound.match.id,
            opponentMatchParticipant.userId
          )
        }
      }

      // Check and complete round
      if (
        matchRoundParticipant &&
        matchRoundParticipant.matchRound &&
        matchRoundParticipant.matchRound.match
      ) {
        await this.checkAndCompleteRound(
          matchRoundParticipant.matchRoundId,
          matchRoundParticipant.matchRound.match.id
        )
      }
    }

    return {
      statusCode: 200,
      data: roundQuestion,
      message: this.i18nService.translate(RoundQuestionMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // The following methods are adapted from processor logic to keep behaviour consistent
  private async checkAndCompleteRound(matchRoundId: number, matchId: number) {
    // fetch round and verify both participants completed
    const matchRound = await this.prismaService.matchRound.findUnique({
      where: { id: matchRoundId },
      include: {
        participants: { include: { matchParticipant: { include: { user: true } } } }
      }
    })
    if (!matchRound) return

    // ✅ GUARD: Skip if round already COMPLETED to prevent duplicate emissions
    if (matchRound.status === 'COMPLETED') {
      console.log(
        `[RoundQuestion Service] Round ${matchRoundId} already COMPLETED, skipping duplicate completion`
      )
      return
    }

    const allParticipants = matchRound.participants
    const allCompleted = allParticipants.every((p) => p.status === 'COMPLETED')
    if (!allCompleted) {
      const completedParticipant = allParticipants.find((p) => p.status === 'COMPLETED')
      if (completedParticipant) {
        const completedUserId = completedParticipant.matchParticipant.userId
        this.matchingGateway.notifyWaitingForOpponent(
          matchId,
          completedUserId,
          matchRound.roundNumber
        )
      }
      return
    }

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

    console.log(
      `[RoundQuestion Service] Round results: p1={points:${p1.points}, answers:${p1AnswerCount}}, p2={points:${p2.points}, answers:${p2AnswerCount}}`
    )

    let winnerId: number | null = null

    // ✅ TIE CASE 1: Both have 0 points and neither answered any question
    if (
      (p1.points || 0) === 0 &&
      (p2.points || 0) === 0 &&
      p1AnswerCount === 0 &&
      p2AnswerCount === 0
    ) {
      console.log(
        `[RoundQuestion Service] TIE: Both participants have 0 points and no answers`
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
      console.log(
        `[RoundQuestion Service] Participant ${p2.matchParticipantId} wins: answered ${p2AnswerCount} questions vs ${p1AnswerCount}`
      )
    } else if (
      (p1.points || 0) === 0 &&
      (p2.points || 0) === 0 &&
      p1AnswerCount > 0 &&
      p2AnswerCount === 0
    ) {
      winnerId = p1.matchParticipantId
      console.log(
        `[RoundQuestion Service] Participant ${p1.matchParticipantId} wins: answered ${p1AnswerCount} questions vs ${p2AnswerCount}`
      )
    }
    // ✅ Normal comparison: higher points wins
    else if ((p1.points || 0) > (p2.points || 0)) {
      winnerId = p1.matchParticipantId
      console.log(
        `[RoundQuestion Service] Participant ${p1.matchParticipantId} wins with ${p1.points} points vs ${p2.points}`
      )
    } else if ((p1.points || 0) < (p2.points || 0)) {
      winnerId = p2.matchParticipantId
      console.log(
        `[RoundQuestion Service] Participant ${p2.matchParticipantId} wins with ${p2.points} points vs ${p1.points}`
      )
    } else {
      // Equal points, compare time
      if ((p1.totalTimeMs || 0) < (p2.totalTimeMs || 0)) {
        winnerId = p1.matchParticipantId
        console.log(
          `[RoundQuestion Service] Participant ${p1.matchParticipantId} wins by faster time: ${p1.totalTimeMs}ms vs ${p2.totalTimeMs}ms`
        )
      } else {
        winnerId = p2.matchParticipantId
        console.log(
          `[RoundQuestion Service] Participant ${p2.matchParticipantId} wins by faster time: ${p2.totalTimeMs}ms vs ${p1.totalTimeMs}ms`
        )
      }
    }

    const updatedRound = await this.prismaService.matchRound.update({
      where: { id: matchRoundId },
      data: { status: 'COMPLETED', roundWinnerId: winnerId },
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

    const userId1 = allParticipants[0].matchParticipant.userId
    const userId2 = allParticipants[1].matchParticipant.userId
    this.matchingGateway.notifyRoundCompleted(matchId, userId1, userId2, updatedRound)

    await this.scheduleNextRound(matchId, updatedRound.roundNumber)
  }

  private async scheduleNextRound(matchId: number, currentRoundNumber: string) {
    const roundMap: Record<string, string | null> = {
      ONE: 'TWO',
      TWO: 'THREE',
      THREE: null
    }
    const nextRoundNumber = roundMap[currentRoundNumber]
    if (!nextRoundNumber) {
      await this.completeMatch(matchId)
      return
    }

    const nextRound = await this.prismaService.matchRound.findFirst({
      where: { matchId, roundNumber: nextRoundNumber as any, deletedAt: null },
      include: {
        participants: {
          include: { matchParticipant: { include: { user: true } } },
          orderBy: { orderSelected: 'asc' }
        }
      }
    })
    if (!nextRound) return

    // ✅ GUARD: Check if round already IN_PROGRESS to prevent duplicate notifications
    if (nextRound.status === 'IN_PROGRESS') {
      console.log(
        `[RoundQuestion Service] Round ${nextRoundNumber} already IN_PROGRESS for match ${matchId}, skipping notifyRoundStarting`
      )
      return
    }

    const userId1 = nextRound.participants[0]?.matchParticipant.userId
    const userId2 = nextRound.participants[1]?.matchParticipant.userId
    if (!userId1 || !userId2) return

    this.matchingGateway.notifyRoundStarting(
      matchId,
      userId1,
      userId2,
      nextRoundNumber,
      5000
    )

    await this.matchRoundParticipantTimeoutQueue.add(
      BullAction.START_ROUND,
      { matchRoundId: nextRound.id, matchId },
      { delay: 5000 }
    )
  }

  private async completeMatch(matchId: number) {
    // Guard check: prevent duplicate processing if match already completed
    const currentMatch = await this.prismaService.match.findUnique({
      where: { id: matchId },
      select: { status: true }
    })

    if (currentMatch?.status === 'COMPLETED') {
      console.log(
        `[RoundQuestion Service] Match ${matchId} already COMPLETED, skipping duplicate processing`
      )
      return
    }

    console.log(`[RoundQuestion Service] Starting completeMatch for matchId=${matchId}`)

    // similar to processor.completeMatch
    const allRounds = await this.prismaService.matchRound.findMany({
      where: { matchId, deletedAt: null },
      include: {
        roundWinner: { include: { user: true } },
        participants: { include: { matchParticipant: { include: { user: true } } } }
      },
      orderBy: { roundNumber: 'asc' }
    })
    if (allRounds.length !== 3) {
      console.warn(
        `[RoundQuestion Service] Match ${matchId} has ${allRounds.length} rounds, expected 3`
      )
      return
    }

    const roundWinCounts = new Map<number, number>()
    let tieCount = 0

    for (const round of allRounds) {
      if (round.roundWinnerId) {
        roundWinCounts.set(
          round.roundWinnerId,
          (roundWinCounts.get(round.roundWinnerId) || 0) + 1
        )
      } else {
        // ✅ Round is a tie (roundWinnerId is null)
        tieCount++
      }
    }

    console.log(
      `[RoundQuestion Service] Round win counts: ${JSON.stringify(Object.fromEntries(roundWinCounts))}, ties=${tieCount}`
    )

    let matchWinnerId: number | null = null
    let maxWins = 0
    for (const [participantId, wins] of roundWinCounts.entries())
      if (wins > maxWins) {
        maxWins = wins
        matchWinnerId = participantId
      }

    // ✅ MATCH TIE: No one won 2 rounds (all 3 are ties OR 1-1-tie OR 0-0-tie, etc.)
    if (maxWins === 0 && tieCount > 0) {
      console.log(
        `[RoundQuestion Service] MATCH TIE: All 3 rounds resulted in ties (no clear winner)`
      )
      matchWinnerId = null
    } else if (maxWins === 0 || !matchWinnerId) {
      // ✅ Fallback: Use total points as tiebreaker (if somehow no wins recorded)
      const participantTotals = new Map<number, number>()
      for (const round of allRounds)
        for (const participant of round.participants)
          participantTotals.set(
            participant.matchParticipantId,
            (participantTotals.get(participant.matchParticipantId) || 0) +
              (participant.points || 0)
          )
      let maxPoints = 0
      for (const [participantId, totalPoints] of participantTotals.entries())
        if (totalPoints > maxPoints) {
          maxPoints = totalPoints
          matchWinnerId = participantId
        }

      // ✅ If still no winner (all totals are 0), it's a tie
      if (maxPoints === 0 && matchWinnerId) {
        console.log(`[RoundQuestion Service] MATCH TIE: Both players have 0 total points`)
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
      console.log(
        `[RoundQuestion Service] Match winner determined: participantId=${matchWinnerId}, userId=${winnerParticipant?.userId}, maxWins=${maxWins}`
      )
    } else {
      console.log(`[RoundQuestion Service] Match is a TIE: no winner, maxWins=${maxWins}`)
    }

    // Wrap entire flow in atomic transaction to prevent race conditions
    try {
      const result = await this.prismaService.$transaction(
        async (tx) => {
          // First, update match status to COMPLETED to claim ownership
          const completedMatch = await tx.match.update({
            where: { id: matchId },
            data: { status: 'COMPLETED', winnerId: winnerParticipant?.userId || null },
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
                      matchParticipant: { include: { user: true } },
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

          // ✅ Only update ELO if there's a clear winner (not a tie)
          if (winnerUserId && loserUserId) {
            const winnerUser = participants.find((p) => p.userId === winnerUserId)?.user
            const loserUser = participants.find((p) => p.userId === loserUserId)?.user

            const winnerElo = (winnerUser && winnerUser.eloscore) || 0
            const loserElo = (loserUser && loserUser.eloscore) || 0

            console.log(
              `[RoundQuestion Service] ELO before: winner=${winnerElo}, loser=${loserElo}`
            )

            eloGained = calculateEloGain(winnerElo, loserElo)
            eloLost = calculateEloLoss(loserElo, winnerElo)

            console.log(
              `[RoundQuestion Service] ELO delta: gained=${eloGained}, lost=${eloLost}`
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

            console.log(
              `[RoundQuestion Service] ELO after: winner=${newWinnerElo}, loser=${newLoserElo}`
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

                console.log(
                  `[RoundQuestion Service] Match TIE (no answers): Both lose ELO - user1Loss=${user1EloLoss}, user2Loss=${user2EloLoss}`
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

                console.log(
                  `[RoundQuestion Service] ELO after penalty: user1=${newUser1Elo}, user2=${newUser2Elo}`
                )
              } else {
                // Normal tie with answers -> No ELO changes
                console.log(
                  `[RoundQuestion Service] Match TIE (with answers): No ELO changes, eloGained=${eloGained}, eloLost=${eloLost}`
                )
              }
            }
          }

          return { completedMatch, eloGained, eloLost, rankChanges }
        },
        { timeout: 10000 }
      ) // 10 seconds timeout for entire transaction)

      console.log(
        `[RoundQuestion Service] Transaction completed successfully for match ${matchId}`
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

        console.log(
          `[RoundQuestion Service] Sending match completed notification for match ${matchId}`
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
    } catch (e) {
      console.error(`[RoundQuestion Service] Error completing match ${matchId}:`, e)
      // Don't swallow errors - let them bubble up
      throw e
    }
  }
}
