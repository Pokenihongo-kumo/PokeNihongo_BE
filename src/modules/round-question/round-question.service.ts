import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { QuestionBankService } from '@/modules/question-bank/question-bank.service'
import { NotFoundRecordException } from '@/shared/error'
import {
  addTimeUTC,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { MatchingGateway } from '@/websockets/matching.gateway'
import { InjectQueue } from '@nestjs/bull'
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { Queue } from 'bull'
import {
  RoundQuestionAlreadyAnsweredException,
  RoundQuestionNotFoundException
} from './dto/round-question.error'
import {
  AnswerQuestionBody,
  CreateRoundQuestionBody,
  UpdateRoundQuestionBody
} from './dto/round-question.zod-dto'
import { RoundQuestionTimeoutProcessor } from './round-question-timeout.processor'
import { RoundCompletionService } from './round-completion.service'
import { RoundQuestionRepo } from './round-question.repo'

@Injectable()
export class RoundQuestionService {
  private readonly logger = new Logger(RoundQuestionService.name)

  constructor(
    private roundQuestionRepo: RoundQuestionRepo,
    private readonly matchingGateway: MatchingGateway,
    private readonly questionBankService: QuestionBankService,
    @InjectQueue(BullQueue.ROUND_QUESTION_TIMEOUT)
    private readonly roundQuestionTimeoutQueue: Queue,
    @Inject(forwardRef(() => RoundQuestionTimeoutProcessor))
    private readonly roundQuestionProcessor: RoundQuestionTimeoutProcessor,
    private readonly roundCompletion: RoundCompletionService
  ) {}

  async list(pagination: PaginationQuery) {
    const data = await this.roundQuestionRepo.list(pagination)
    return data
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number) {
    const roundQuestion = await this.roundQuestionRepo.findById(id)
    if (!roundQuestion) {
      throw new RoundQuestionNotFoundException()
    }

    return roundQuestion
  }

  async create({ userId, data }: { userId: number; data: CreateRoundQuestionBody }) {
    try {
      const result = await this.roundQuestionRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return result
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

  async update({
    id,
    data,
    userId
  }: {
    id: number
    data: UpdateRoundQuestionBody
    userId?: number
  }) {
    try {
      const roundQuestion = await this.roundQuestionRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return roundQuestion
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

  async delete({ id, userId }: { id: number; userId?: number }) {
    try {
      const existRoundQuestion = await this.roundQuestionRepo.findById(id)
      if (!existRoundQuestion) {
        throw new RoundQuestionNotFoundException()
      }

      await this.roundQuestionRepo.delete(id)
      return
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
      data: AnswerQuestionBody
      userId: number
    },
    lang: string = 'vi'
  ) {
    // Fetch roundQuestion first to get matchRoundParticipantId
    const roundQuestion = await this.roundQuestionRepo.findForAnswer(id)

    if (!roundQuestion) throw new RoundQuestionNotFoundException()
    // Only the player's own question (the opponent's could be answered), and
    // once: checked before any timer or log is touched
    if (roundQuestion.matchRoundParticipant.matchParticipant.userId !== userId) {
      throw new RoundQuestionNotFoundException()
    }
    if (roundQuestion.roundQuestionsAnswerLogs.length > 0) {
      throw new RoundQuestionAlreadyAnsweredException()
    }

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
        this.logger.debug(
          `[RoundQuestion] 🗑️ Removing ${jobsToRemove.length} timeout job(s) for roundQuestionId=${id}, participantId=${roundQuestion.matchRoundParticipantId}: jobIds=[${jobsToRemove.map((j) => j.id).join(', ')}]`
        )
      }

      await Promise.all(jobsToRemove.map((j) => j.remove()))
    } catch (e) {
      this.logger.warn('[RoundQuestion] Failed to remove timeout job', e)
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
    const existingAnswerLog = await this.roundQuestionRepo.findAnswerLog(id)

    let finalAnswerLog: any = existingAnswerLog
    if (existingAnswerLog) {
      finalAnswerLog = await this.roundQuestionRepo.updateAnswerLog(
        existingAnswerLog.id,
        {
          answerId: data.answerId,
          timeAnswerMs: data.timeAnswerMs,
          isCorrect,
          pointsEarned
        }
      )
    } else {
      finalAnswerLog = await this.roundQuestionRepo.createAnswerLog(id, {
        answerId: data.answerId,
        timeAnswerMs: data.timeAnswerMs,
        isCorrect,
        pointsEarned
      })
    }

    // Find participant/match info and determine next question BEFORE notifying
    const matchRoundParticipant = await this.roundQuestionRepo.findParticipantWithMatch(
      roundQuestion.matchRoundParticipantId
    )
    let endTimeQuestion: Date | null = null

    // Determine and schedule next question (if any) so we can include it in the socket payload
    let nextQuestion: any | null = null
    try {
      if (matchRoundParticipant) {
        nextQuestion = await this.roundQuestionRepo.findNextQuestion(
          roundQuestion.matchRoundParticipantId,
          roundQuestion.orderNumber
        )

        if (nextQuestion) {
          // CRITICAL: Clear any pending setTimeout for next question
          // This prevents double-firing when user answers current question early
          this.roundQuestionProcessor.clearQuestionTimeout(
            nextQuestion.id,
            roundQuestion.matchRoundParticipantId
          )

          endTimeQuestion = addTimeUTC(new Date(), nextQuestion.timeLimitMs)
          await this.roundQuestionRepo.setQuestionEndTime(
            nextQuestion.id,
            endTimeQuestion
          )

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
      this.logger.warn('[RoundQuestion] Failed to schedule next question timeout', e)
      // keep going even if scheduling fails - we'll still notify the answer result
    }

    // Prepare formatted nextQuestion for notification (use repository to avoid DI cycles)
    let nextQuestionForNotify: any | null = null
    if (nextQuestion) {
      try {
        const qbList = await this.questionBankService.getByIds(
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
        this.logger.warn(
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
        const nextQuestion = await this.roundQuestionRepo.findNextQuestionWithAnswers(
          roundQuestion.matchRoundParticipantId,
          roundQuestion.orderNumber
        )

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
            this.logger.debug(
              `[RoundQuestion] 🗑️ Found ${duplicateJobs.length} existing job(s) for next question ${nextQuestion.id}, removing them`
            )
            await Promise.all(duplicateJobs.map((j) => j.remove()))
          }

          const endTimeQuestion = addTimeUTC(new Date(), nextQuestion.timeLimitMs)
          await this.roundQuestionRepo.setQuestionEndTime(
            nextQuestion.id,
            endTimeQuestion
          )

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
        this.logger.warn('[RoundQuestion] Failed to schedule next question timeout', e)
      }
    }

    if (isLastQuestion) {
      // Calculate totals
      const allAnswerLogs = await this.roundQuestionRepo.findAnswerLogsOfParticipant(
        roundQuestion.matchRoundParticipantId
      )

      const totalTimeMs = allAnswerLogs.reduce((sum, l) => sum + (l.timeAnswerMs || 0), 0)
      const points = allAnswerLogs.reduce((sum, l) => sum + (l.pointsEarned || 0), 0)

      const updatedParticipant = await this.roundQuestionRepo.completeParticipant(
        roundQuestion.matchRoundParticipantId,
        totalTimeMs,
        points
      )

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
        const opponentRoundParticipant = await this.roundQuestionRepo.findOpponentInRound(
          matchRoundParticipant.matchRoundId,
          opponentMatchParticipant.userId
        )

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
        await this.roundCompletion.checkAndCompleteRound(
          matchRoundParticipant.matchRoundId,
          matchRoundParticipant.matchRound.match.id
        )
      }
    }

    return roundQuestion
  }

  // ---- For other modules (module-boundary plan B6) ----
  // Same arguments and results as the repo methods.

  findByMatchRoundParticipantId(
    ...args: Parameters<RoundQuestionRepo['findByMatchRoundParticipantId']>
  ) {
    return this.roundQuestionRepo.findByMatchRoundParticipantId(...args)
  }

  // ---- For other modules: Questions made for a round (match-round-participant) (B7) ----

  createQuestionRow(...args: Parameters<RoundQuestionRepo['createQuestionRow']>) {
    return this.roundQuestionRepo.createQuestionRow(...args)
  }

  findQuestionsOfParticipant(
    ...args: Parameters<RoundQuestionRepo['findQuestionsOfParticipant']>
  ) {
    return this.roundQuestionRepo.findQuestionsOfParticipant(...args)
  }

  setDebuffAndPoints(...args: Parameters<RoundQuestionRepo['setDebuffAndPoints']>) {
    return this.roundQuestionRepo.setDebuffAndPoints(...args)
  }

  setDebuff(...args: Parameters<RoundQuestionRepo['setDebuff']>) {
    return this.roundQuestionRepo.setDebuff(...args)
  }

  // ---- For other modules: Questions for the pick timeout and round start (B7) ----

  countForParticipants(...args: Parameters<RoundQuestionRepo['countForParticipants']>) {
    return this.roundQuestionRepo.countForParticipants(...args)
  }

  findFirstQuestion(...args: Parameters<RoundQuestionRepo['findFirstQuestion']>) {
    return this.roundQuestionRepo.findFirstQuestion(...args)
  }

  setQuestionEndTime(...args: Parameters<RoundQuestionRepo['setQuestionEndTime']>) {
    return this.roundQuestionRepo.setQuestionEndTime(...args)
  }
}
