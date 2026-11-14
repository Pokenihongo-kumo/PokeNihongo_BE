import {
  GetUserExerciseAttemptListQueryType,
  LatestExerciseAttemptsByLessonResType,
  UpdateUserExerciseAttemptBodyType
} from '@/modules/user-exercise-attempt/entities/user-exercise-attempt.entity'
import {
  AttemptNotOwnedException,
  ExerciseAttemptNotInProgressException,
  ExerciseHasNoTestSetException,
  InvalidUserExerciseAttemptDataException,
  LessonBlockedException,
  LessonPrerequisiteNotMetException,
  ReviewInsufficientScoreException,
  UserExerciseAttemptNotFoundException
} from '@/modules/user-exercise-attempt/dto/user-exercise-attempt.error'
import { UserExerciseAttemptRepo } from '@/modules/user-exercise-attempt/user-exercise-attempt.repo'
import { QuestionBankService } from '@/modules/question-bank/question-bank.service'
import { UserAnswerLogService } from '@/modules/user-answer-log/user-answer-log.service'
import { UserProgressService } from '@/modules/user-progress/user-progress.service'
import { ExercisesService } from '@/modules/exercises/exercises.service'
import { ExercisesRepo } from '@/modules/exercises/exercises.repo'
import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { TranslationHelperService } from '@/modules/translation/translation.helper.service'
import { I18nService } from '@/i18n/i18n.service'
import { UserExerciseAttemptMessage as M } from '@/i18n/message-keys'
import { pickLabelFromComposite } from '@/common/utils/prase.utils'
import { calculateScore } from '@/common/utils/algorithm'
import { toPaginationMeta } from '@/shared/utils/pagination'
import { isNotFoundPrismaError } from '@/shared/utils/prisma-errors'
import { ProgressStatus, UserRewardSourceType } from '@prisma/client'
import { RewardService } from '../reward/reward.service'

@Injectable()
export class UserExerciseAttemptService {
  private readonly logger = new Logger(UserExerciseAttemptService.name)

  constructor(
    private readonly userExerciseAttemptRepository: UserExerciseAttemptRepo,
    private readonly questionBankService: QuestionBankService,
    private readonly userAnswerLogService: UserAnswerLogService,
    private readonly userProgressService: UserProgressService,
    private readonly exercisesService: ExercisesService,
    private readonly exercisesRepository: ExercisesRepo,
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly translationHelper: TranslationHelperService,
    private readonly i18nService: I18nService,
    private readonly rewardService: RewardService
  ) {}

  private async grantExerciseRewards(
    rewardIds: number[] | undefined | null,
    userId: number,
    options?: { reduceReward?: boolean },
    exerciseId?: number | null
  ) {
    if (!Array.isArray(rewardIds) || rewardIds.length === 0) {
      return null
    }

    const uniqueRewardIds = Array.from(new Set(rewardIds))
    this.logger.log(
      `Granting rewards for exercise: ${exerciseId} for user: ${userId} with rewardIds: ${uniqueRewardIds}`
    )
    return this.rewardService.convertRewardsWithUser(
      uniqueRewardIds,
      userId,
      UserRewardSourceType.EXERCISE,
      {
        reduceReward: options?.reduceReward ?? false
      },
      exerciseId
    )
  }

  async create(userId: number, exerciseId: number, lang: string = 'vi') {
    try {
      // The exercise (404 from ExercisesService when missing) and its lesson
      const exercise = await this.exercisesService.findById(exerciseId)
      const targetLessonId = exercise.lessonId

      // A user above the lesson's JLPT level is never blocked
      // (N4 = 4 < N5 = 5: not blocked; N5 = N5: the checks below apply)
      const user = await this.sharedUserRepository.findUnique({ id: userId })
      const userLevelJLPT = user?.levelJLPT ?? null
      const lessonLevelJlpt =
        await this.exercisesRepository.getLessonLevelJlpt(targetLessonId)
      const shouldSkipBlocking =
        userLevelJLPT !== null &&
        lessonLevelJlpt !== null &&
        userLevelJLPT < lessonLevelJlpt

      // Studying another lesson: only a COMPLETED lesson can be redone
      const currentInProgressLesson =
        await this.userProgressService.getCurrentInProgressLesson(userId)
      if (
        currentInProgressLesson &&
        !shouldSkipBlocking &&
        currentInProgressLesson.lessonId !== targetLessonId
      ) {
        const targetLessonProgress =
          await this.userProgressService.getUserProgressByLesson(userId, targetLessonId)
        if (!targetLessonProgress || targetLessonProgress.status !== 'COMPLETED') {
          throw new LessonBlockedException()
        }
      }

      const userExerciseAttempt = await this.userExerciseAttemptRepository.create({
        userId,
        exerciseId
      })

      // Starting an exercise puts the lesson IN_PROGRESS
      await this.updateUserProgressOnStart(userId, exerciseId)

      return {
        data: userExerciseAttempt,
        message: this.i18nService.translate(M.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toAttemptError(error)
    }
  }

  async findAll(query: GetUserExerciseAttemptListQueryType, lang: string = 'vi') {
    const { currentPage, pageSize, userId, exerciseId, status } = query
    const result = await this.userExerciseAttemptRepository.findMany({
      currentPage,
      pageSize,
      userId,
      exerciseId,
      status
    })
    return {
      statusCode: 200,
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang),
      data: {
        results: result.items,
        pagination: toPaginationMeta(currentPage, pageSize, result.total)
      }
    }
  }

  async findOne(id: number, lang: string = 'vi') {
    const userExerciseAttempt = await this.userExerciseAttemptRepository.findUnique({
      id
    })
    if (!userExerciseAttempt) {
      throw new UserExerciseAttemptNotFoundException()
    }
    return {
      data: userExerciseAttempt,
      message: this.i18nService.translate(M.GET_SUCCESS, lang)
    }
  }

  // The app continues or skips its own attempt
  async update(
    id: number,
    body: UpdateUserExerciseAttemptBodyType,
    userId: number,
    lang: string = 'vi'
  ) {
    try {
      await this.ownAttempt(id, userId)
      const userExerciseAttempt = await this.userExerciseAttemptRepository.update(
        { id },
        body
      )
      return {
        data: userExerciseAttempt,
        message: this.i18nService.translate(M.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toAttemptError(error)
    }
  }

  async remove(id: number, lang: string = 'vi') {
    try {
      const userExerciseAttempt = await this.userExerciseAttemptRepository.delete({ id })
      return {
        data: userExerciseAttempt,
        message: this.i18nService.translate(M.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toAttemptError(error)
    }
  }

  // Only reads the result, writes nothing
  async checkExerciseCompletion(
    userExerciseAttemptId: number,
    userId: number,
    lang: string = 'vi'
  ) {
    const { allQuestions, userAnswers, unansweredQuestions } = await this.gradeAttempt(
      userExerciseAttemptId,
      userId
    )

    if (unansweredQuestions.length > 0) {
      return {
        statusCode: 200,
        message: this.i18nService.translate(M.NOT_ALL_ANSWERED, lang),
        data: {
          isCompleted: false,
          totalQuestions: allQuestions.length,
          answeredQuestions: userAnswers.length,
          unansweredQuestions: unansweredQuestions.length,
          unansweredQuestionIds: unansweredQuestions.map((q) => q.id),
          allCorrect: false,
          status: 'IN_PROGRESS'
        }
      }
    }

    const allCorrect = userAnswers.every((log) => log.isCorrect)
    return {
      statusCode: 200,
      message: this.i18nService.translate(
        allCorrect ? M.ALL_CORRECT : M.SOME_INCORRECT,
        lang
      ),
      data: {
        isCompleted: true,
        totalQuestions: allQuestions.length,
        answeredQuestions: userAnswers.length,
        unansweredQuestions: 0,
        allCorrect,
        status: allCorrect ? 'COMPLETED' : 'FAILED'
      }
    }
  }

  // Grades the attempt and saves the result: every answer right is COMPLETED
  // (rewards, reduced when done before), anything else FAILED
  async submitExerciseCompletion(
    userExerciseAttemptId: number,
    userId: number,
    timeSeconds?: number,
    lang: string = 'vi'
  ) {
    const { attempt, exercise, allQuestions, userAnswers, unansweredQuestions, score } =
      await this.gradeAttempt(userExerciseAttemptId, userId)
    const time = timeSeconds !== undefined ? { time: timeSeconds } : {}

    // Nothing answered, or not everything: FAILED
    if (userAnswers.length === 0 || unansweredQuestions.length > 0) {
      await this.userExerciseAttemptRepository.update(
        { id: userExerciseAttemptId },
        { status: 'FAILED', ...time }
      )
      await this.updateUserProgressOnExerciseCompletion(
        attempt.userId,
        attempt.exerciseId,
        ProgressStatus.FAILED
      )
      const unanswered = userAnswers.length === 0 ? allQuestions : unansweredQuestions
      return {
        statusCode: 200,
        message: this.i18nService.translate(
          userAnswers.length === 0 ? M.SUBMITTED_NO_ANSWER : M.SUBMITTED_INCOMPLETE,
          lang
        ),
        data: {
          isCompleted: true,
          totalQuestions: allQuestions.length,
          answeredQuestions: userAnswers.length,
          unansweredQuestions: unanswered.length,
          unansweredQuestionIds: unanswered.map((q) => q.id),
          allCorrect: false,
          status: 'FAILED',
          score,
          rewards: null
        }
      }
    }

    const allCorrect = userAnswers.every((log) => log.isCorrect)
    const newStatus = allCorrect ? 'COMPLETED' : 'FAILED'
    // Read before this attempt is saved as COMPLETED
    const hasCompletedBefore = allCorrect
      ? await this.userExerciseAttemptRepository.hasCompletedAttempt(
          attempt.userId,
          attempt.exerciseId
        )
      : false

    await this.userExerciseAttemptRepository.update(
      { id: userExerciseAttemptId },
      { status: newStatus, ...time }
    )
    this.logger.log(`Updated attempt ${userExerciseAttemptId} to ${newStatus}`)

    let rewardResults: unknown = null
    if (allCorrect) {
      // A completed exercise keeps the lesson IN_PROGRESS
      await this.updateUserProgressOnExerciseCompletion(
        attempt.userId,
        attempt.exerciseId,
        ProgressStatus.IN_PROGRESS
      )
      rewardResults = await this.grantExerciseRewards(
        exercise.rewardId,
        attempt.userId,
        { reduceReward: hasCompletedBefore },
        attempt.exerciseId
      )
    } else {
      await this.updateUserProgressOnExerciseCompletion(
        attempt.userId,
        attempt.exerciseId,
        ProgressStatus.FAILED
      )
    }

    return {
      statusCode: 200,
      message: this.i18nService.translate(
        allCorrect ? M.ALL_CORRECT : M.SOME_INCORRECT,
        lang
      ),
      data: {
        isCompleted: true,
        totalQuestions: allQuestions.length,
        answeredQuestions: userAnswers.length,
        unansweredQuestions: 0,
        allCorrect,
        status: newStatus,
        score,
        rewards: rewardResults
      }
    }
  }

  async abandon(
    userExerciseAttemptId: number,
    userId: number,
    timeSeconds?: number,
    lang: string = 'vi'
  ) {
    const attempt = await this.ownAttempt(userExerciseAttemptId, userId)
    if (attempt.status !== 'IN_PROGRESS') {
      throw new ExerciseAttemptNotInProgressException()
    }
    const updatedAttempt = await this.userExerciseAttemptRepository.update(
      { id: userExerciseAttemptId },
      {
        status: 'ABANDONED',
        ...(timeSeconds !== undefined ? { time: timeSeconds } : {})
      }
    )
    return {
      statusCode: 200,
      message: this.i18nService.translate(M.ABANDON_SUCCESS, lang),
      data: updatedAttempt
    }
  }

  async getStatus(userExerciseAttemptId: number, userId: number, lang: string = 'vi') {
    const attempt = await this.ownAttempt(userExerciseAttemptId, userId)
    return {
      statusCode: 200,
      message: this.i18nService.translate(M.GET_STATUS_SUCCESS, lang),
      data: attempt
    }
  }

  // The user's newest attempt of the same exercise as this one
  async getLatestStatus(
    userExerciseAttemptId: number,
    userId: number,
    lang: string = 'vi'
  ) {
    const baseAttempt = await this.ownAttempt(userExerciseAttemptId, userId)
    const latestAttempt =
      await this.userExerciseAttemptRepository.findLatestByUserAndExercise(
        userId,
        baseAttempt.exerciseId
      )
    return {
      statusCode: 200,
      message: this.i18nService.translate(M.GET_STATUS_SUCCESS, lang),
      data: latestAttempt ?? baseAttempt
    }
  }

  async getLatestExerciseAttemptsByLesson(
    userId: number,
    lessonId: number,
    lang: string = 'vi'
  ): Promise<LatestExerciseAttemptsByLessonResType> {
    // No skipping ahead: a lesson not started opens only when the one before
    // it was started
    const checkUserProgress = await this.userProgressService.findByUserAndLesson(
      userId,
      lessonId
    )
    if (checkUserProgress.data.status === 'NOT_STARTED') {
      const previousLessonId =
        await this.userProgressService.getPreviousLessonId(lessonId)
      if (previousLessonId) {
        const prevProgress = await this.userProgressService.getUserProgressByLesson(
          userId,
          previousLessonId
        )
        if (prevProgress && prevProgress.status === 'NOT_STARTED') {
          throw new LessonPrerequisiteNotMetException(previousLessonId, lessonId)
        }
      }
    }

    // One attempt per exercise of the lesson (made NOT_STARTED when missing)
    const result = await this.userExerciseAttemptRepository.findLatestByLessonAndUser(
      userId,
      lessonId
    )
    return {
      statusCode: 200,
      data: result,
      message: this.i18nService.translate(M.LATEST_BY_LESSON_SUCCESS, lang)
    }
  }

  async getExerciseAttemptByExerciseId(
    id: number,
    userId: number,
    languageCode: string
  ): Promise<MessageResDTO | null> {
    try {
      // Lấy attempt base để biết exerciseId
      const baseAttemptRes = await this.findOne(id, languageCode)
      const baseAttempt = baseAttemptRes.data as any

      // Kiểm tra attempt có thuộc về user này không
      if (baseAttempt?.userId !== userId) {
        throw new AttemptNotOwnedException()
      }

      const exerciseId = baseAttempt.exerciseId

      // Tìm attempt gần nhất theo thứ tự ưu tiên: IN_PROGRESS > ABANDONED > SKIPPED > COMPLETED/FAILED
      const latestAttempt = await this.userExerciseAttemptRepository.findLatestByPriority(
        userId,
        exerciseId
      )

      if (!latestAttempt) {
        throw new UserExerciseAttemptNotFoundException()
      }

      // Nếu attempt gần nhất là SKIPPED, COMPLETED hoặc FAILED → tạo attempt mới hoàn toàn
      let attempt = latestAttempt
      let userExerciseAttemptId = latestAttempt.id
      let shouldLoadOldAnswers = false // Chỉ load answers cũ nếu là ABANDONED

      if (latestAttempt.status === 'NOT_STARTED') {
        // Nếu là NOT_STARTED, update thành IN_PROGRESS
        this.logger.log(
          `Latest attempt is NOT_STARTED, updating to IN_PROGRESS for user ${userId}, exercise ${exerciseId}`
        )
        const updatedAttempt = await this.userExerciseAttemptRepository.update(
          { id: latestAttempt.id },
          { status: 'IN_PROGRESS' }
        )
        attempt = updatedAttempt as any
        userExerciseAttemptId = attempt.id
        shouldLoadOldAnswers = false
      } else if (
        latestAttempt.status === 'SKIPPED' ||
        latestAttempt.status === 'COMPLETED' ||
        latestAttempt.status === 'FAILED'
      ) {
        this.logger.log(
          `Latest attempt is ${latestAttempt.status}, creating new attempt for user ${userId}, exercise ${exerciseId}`
        )
        const createAttempt = await this.create(userId, exerciseId, languageCode)
        attempt = createAttempt.data as any
        userExerciseAttemptId = attempt.id
        // Khi tạo mới từ SKIPPED/COMPLETED/FAILED, không load answers cũ
        shouldLoadOldAnswers = false
      } else if (latestAttempt.status === 'ABANDONED') {
        // Nếu là ABANDONED, load answers cũ để khôi phục
        shouldLoadOldAnswers = true
      }

      const result =
        await this.exercisesService.getExercisesByIdHaveQuestionBanks(exerciseId)
      // Map translations: question strictly from translation; answers from translation or parsed composite string
      const testSet = (result.data as any)?.testSet
      const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'
      // Load user answer logs chỉ nếu cần khôi phục (ABANDONED)
      let selectedAnswerIds = new Set<number>()
      let answeredCount = 0
      if (shouldLoadOldAnswers) {
        try {
          const logsRes =
            await this.userAnswerLogService.findByUserExerciseAttemptId(
              userExerciseAttemptId
            )
          const logs = (logsRes?.data?.results || []) as any[]
          answeredCount = logs.length
          // Chỉ mark choices nếu là ABANDONED (để khôi phục)
          if (attempt?.status === 'ABANDONED') {
            const ids = logs
              .map((log: any) => log.answerId)
              .filter((v: any) => typeof v === 'number')
            selectedAnswerIds = new Set<number>(ids)
          }
        } catch (e) {
          this.logger.warn('Cannot load user answer logs', e as any)
        }
      } else {
        // Nếu là attempt mới (từ SKIPPED/COMPLETED/FAILED) hoặc IN_PROGRESS, không load answers cũ
        // answeredCount sẽ là 0, selectedAnswerIds sẽ là empty
        try {
          const logsRes =
            await this.userAnswerLogService.findByUserExerciseAttemptId(
              userExerciseAttemptId
            )
          const logs = (logsRes?.data?.results || []) as any[]
          answeredCount = logs.length
        } catch (e) {
          this.logger.warn('Cannot load user answer logs', e as any)
        }
      }
      if (testSet?.testSetQuestionBanks?.length) {
        const mappedBanks = await Promise.all(
          testSet.testSetQuestionBanks.map(async (item: any) => {
            const qb = item.questionBank
            // Question: only via translation key; if missing translation, return empty string
            let questionText = ''
            if (qb?.questionKey) {
              const triedLang = normalizedLang
              const keyCandidates = [
                qb.questionKey,
                qb.questionKey.endsWith('.meaning.1')
                  ? qb.questionKey
                  : `${qb.questionKey}.meaning.1`,
                qb.questionKey.endsWith('.question')
                  ? qb.questionKey
                  : `${qb.questionKey}.question`
              ]
              for (const key of keyCandidates) {
                questionText =
                  (await this.translationHelper.getTranslation(key, triedLang)) || ''
                if (!questionText) {
                  questionText =
                    (await this.translationHelper.getTranslation(key, 'vi')) || ''
                }
                if (questionText) break
              }
            }
            if (!questionText) {
              // fallback to JP original if translation is missing
              questionText = qb?.questionJp || ''
            }

            const mappedAnswers = await Promise.all(
              (qb?.answers || []).map(async (ans: any) => {
                // Always derive from answerJp composite string based on language
                const answerLabel = pickLabelFromComposite(
                  ans?.answerJp || '',
                  normalizedLang
                )
                const isChosen = selectedAnswerIds.has(ans.id)
                return {
                  id: ans.id,
                  answer: answerLabel,
                  ...(isChosen ? { choose: 'choose' } : {})
                }
              })
            )

            return {
              id: item.id,
              questionOrder: item.questionOrder,
              questionBank: {
                id: qb?.id,
                question: questionText,
                answers: mappedAnswers
              }
            }
          })
        )

        result.data = {
          id: (result.data as any).id,
          exerciseType: (result.data as any).exerciseType,
          isBlocked: (result.data as any).isBlocked,
          testSetId: (result.data as any).testSetId,
          testSet: {
            id: testSet.id,
            testSetQuestionBanks: mappedBanks
          }
        } as any
      }

      this.logger.log(
        `Getting exercise attempt for user ${userId} in exercise ${exerciseId}, using attempt ${userExerciseAttemptId} with status ${attempt?.status}`
      )

      return {
        statusCode: 200,
        data: {
          ...result.data,
          userExerciseAttemptId,
          totalQuestions:
            (result.data as any)?.testSet?.testSetQuestionBanks?.length || 0,
          answeredQuestions: answeredCount,
          time: Number(attempt?.time ?? 0)
        },
        message: this.i18nService.translate(M.QUESTIONS_SUCCESS, languageCode)
      }
    } catch (error) {
      this.logger.error('Error getting the exercise questions:', error)
      throw error
    }
  }

  async getExerciseAttemptReview(
    id: number,
    userId: number,
    languageCode: string
  ): Promise<MessageResDTO> {
    try {
      const attemptRes = await this.findOne(id, languageCode)
      const attempt = attemptRes.data as any

      // Kiểm tra attempt có thuộc về user này không
      if ((attempt as any)?.userId !== userId) {
        throw new AttemptNotOwnedException()
      }

      const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'

      // Only build review when attempt is COMPLETED or FAILED
      // NOT_STARTED không được xem review
      if (attempt.status !== 'COMPLETED' && attempt.status !== 'FAILED') {
        return {
          statusCode: 200,
          message: this.i18nService.translate(M.REVIEW_NOT_COMPLETED, normalizedLang),
          data: { status: attempt.status }
        }
      }

      const exerciseRes = await this.exercisesService.getExercisesByIdHaveQuestionBanks(
        attempt.exerciseId
      )
      const testSet = (exerciseRes.data as any)?.testSet

      // Load user answer logs for this attempt
      const logsRes = await this.userAnswerLogService.findByUserExerciseAttemptId(id)
      const logs: Array<{
        questionBankId: number
        answerId: number
        isCorrect: boolean
      }> = (logsRes?.data?.results || []) as any
      const selectedByQuestion = new Map<number, number>(
        logs.map((l) => [Number(l.questionBankId), Number(l.answerId)])
      )

      // Tính tỷ lệ đúng trước khi xử lý review
      const totalQuestions = testSet?.testSetQuestionBanks?.length || 0
      const answeredCorrectCount = logs.filter((l: any) => l.isCorrect).length
      const correctPercentage =
        totalQuestions > 0 ? (answeredCorrectCount / totalQuestions) * 100 : 0
      const roundedPercentage = Math.round(correctPercentage * 100) / 100 // Làm tròn 2 chữ số thập phân để tránh floating point precision issues

      // Kiểm tra xem exercise này có ít nhất 1 lần làm COMPLETED không
      const hasCompletedAttempt =
        await this.userExerciseAttemptRepository.hasCompletedAttempt(
          userId,
          attempt.exerciseId
        )

      // Logic kiểm tra quyền xem review:
      // - Nếu exercise có ít nhất 1 lần làm COMPLETED → được quyền xem (không cần đúng 80%)
      // - Nếu chưa có lần nào COMPLETED → phải đúng >= 80% mới được xem
      if (!hasCompletedAttempt && roundedPercentage < 80) {
        throw new ReviewInsufficientScoreException()
      }

      const translateOrFallback = async (key?: string, jp?: string): Promise<string> => {
        if (key) {
          const t =
            (await this.translationHelper.getTranslation(key, normalizedLang)) ||
            (await this.translationHelper.getTranslation(key, 'vi'))
          if (t) return t
        }
        return jp || ''
      }

      if (testSet?.testSetQuestionBanks?.length) {
        let answeredCorrect = 0
        let answeredInCorrect = 0
        const mappedBanks = await Promise.all(
          testSet.testSetQuestionBanks.map(async (item: any) => {
            const qb = item.questionBank
            // Resolve question via translation keys with variants, fallback JP
            let question = ''
            if (qb?.questionKey) {
              const keyCandidates = [
                qb.questionKey,
                qb.questionKey.endsWith('.meaning.1')
                  ? qb.questionKey
                  : `${qb.questionKey}.meaning.1`,
                qb.questionKey.endsWith('.question')
                  ? qb.questionKey
                  : `${qb.questionKey}.question`
              ]
              for (const key of keyCandidates) {
                const t =
                  (await this.translationHelper.getTranslation(key, normalizedLang)) ||
                  (await this.translationHelper.getTranslation(key, 'vi'))
                if (t) {
                  question = t
                  break
                }
              }
            }
            if (!question) {
              question = qb?.questionJp || ''
            }

            const answers = qb?.answers || []
            const correct = answers.find((a: any) => a.isCorrect)
            const userSelectedId = selectedByQuestion.get(qb.id)
            const userSelected = answers.find((a: any) => a.id === userSelectedId)
            const isCorrect = Boolean(
              correct && userSelectedId && userSelectedId === correct.id
            )
            if (userSelectedId) {
              if (isCorrect) answeredCorrect++
              else answeredInCorrect++
            }

            // Build full answer list; mark correct answer và user-selected incorrect answer
            // Lưu ý: Chỉ khi tỷ lệ đúng >= 80% mới được vào phần này (đã check ở trên)
            // Vì vậy, đáp án đúng sẽ được hiển thị với type: 'correct_answer' và có explanation
            const reviewAnswers: any[] = []
            const toShortLabel = (text: string): string => {
              if (!text) return ''
              // If it looks like an explanation string: "<word>" trong tiếng..., keep the quoted word
              const match = text.match(/"([^"]+)"/)
              if (match && match[1]) return match[1].trim()
              return text.trim()
            }
            for (const a of answers) {
              const label = toShortLabel(
                pickLabelFromComposite(a?.answerJp || '', normalizedLang)
              )
              const explanation = await translateOrFallback(a?.answerKey, a?.answerJp)
              const entry: any = { id: a.id, answer: label }
              // Đánh dấu đáp án đúng (chỉ hiển thị khi tỷ lệ đúng >= 80%)
              if (correct && a.id === correct.id) {
                entry.type = 'correct_answer'
                entry.explantion = explanation
              } else if (
                userSelectedId &&
                a.id === userSelectedId &&
                (!correct || userSelectedId !== correct.id)
              ) {
                // Đánh dấu đáp án user chọn nhưng sai
                entry.type = 'user_selected_incorrect'
                entry.explantion = explanation
              }
              reviewAnswers.push(entry)
            }

            return {
              id: item.id,
              questionOrder: item.questionOrder,
              questionBank: {
                id: qb?.id,
                question,
                isCorrect,
                answers: reviewAnswers
              }
            }
          })
        )

        // Tính score: (số câu đúng / tổng số câu) * 100, max 100 điểm
        const totalQuestions = mappedBanks.length
        const score = calculateScore(answeredCorrect, totalQuestions)

        const data = {
          id: (exerciseRes.data as any).id,
          exerciseType: (exerciseRes.data as any).exerciseType,
          isBlocked: (exerciseRes.data as any).isBlocked,
          testSetId: (exerciseRes.data as any).testSetId,
          testSet: {
            id: testSet.id,
            testSetQuestionBanks: mappedBanks
          },
          totalQuestions,
          answeredCorrect,
          answeredInCorrect,
          score,
          time: Number((attempt as any)?.time ?? 0),
          status: (attempt as any)?.status
        }

        return {
          statusCode: 200,
          message: this.i18nService.translate(M.REVIEW_SUCCESS, normalizedLang),
          data
        }
      }

      return {
        statusCode: 200,
        message: this.i18nService.translate(M.REVIEW_SUCCESS, normalizedLang),
        data: exerciseRes.data
      }
    } catch (error) {
      this.logger.error('Error building exercise attempt review:', error)
      throw error
    }
  }

  //#region helpers
  // The attempt, when it is the user's
  private async ownAttempt(id: number, userId: number) {
    const attempt = await this.userExerciseAttemptRepository.findById(id)
    if (!attempt) throw new UserExerciseAttemptNotFoundException()
    if (attempt.userId !== userId) throw new AttemptNotOwnedException()
    return attempt
  }

  // The questions of the attempt's exercise against the user's answers
  private async gradeAttempt(userExerciseAttemptId: number, userId: number) {
    const attempt = await this.ownAttempt(userExerciseAttemptId, userId)
    const exercise = await this.exercisesService.findById(attempt.exerciseId)
    if (!exercise.testSetId) throw new ExerciseHasNoTestSetException()
    const questionsResult = await this.questionBankService.findByTestSetId(
      exercise.testSetId
    )
    const allQuestions = questionsResult.data.results
    const answerLogsResult =
      await this.userAnswerLogService.findByUserExerciseAttemptId(userExerciseAttemptId)
    const userAnswers = answerLogsResult.data.results
    const answeredQuestionIds = new Set(userAnswers.map((log) => log.questionBankId))
    const unansweredQuestions = allQuestions.filter((q) => !answeredQuestionIds.has(q.id))
    const correctAnswers = userAnswers.filter((log) => log.isCorrect).length
    const score =
      allQuestions.length > 0
        ? Math.round((correctAnswers / allQuestions.length) * 100)
        : 0
    return { attempt, exercise, allQuestions, userAnswers, unansweredQuestions, score }
  }

  private toAttemptError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'Exercise attempt request failed',
      error instanceof Error ? error.stack : error
    )
    if (isNotFoundPrismaError(error)) return new UserExerciseAttemptNotFoundException()
    return new InvalidUserExerciseAttemptDataException()
  }

  // Update UserProgress khi hoàn thành exercise
  // Cập nhật UserProgress dựa trên kết quả tính toán progressPercentage và status
  private async updateUserProgressOnExerciseCompletion(
    userId: number,
    exerciseId: number,
    progressStatus: ProgressStatus
  ) {
    try {
      this.logger.log(
        `Updating user progress for exercise: ${exerciseId} for user: ${userId} with status: ${progressStatus}`
      )

      // 1. Lấy thông tin Exercise để biết lessonId
      const exercise = await this.exercisesService.findById(exerciseId)
      if (!exercise) {
        this.logger.warn(`Exercise ${exerciseId} not found`)
        return
      }

      const lessonId = exercise.lessonId
      this.logger.log(`Exercise ${exerciseId} belongs to lesson ${lessonId}`)

      // 2. Lấy tất cả exercises của lesson này
      const lessonExercises = await this.exercisesService.findByLessonId(lessonId)
      const totalExercises = lessonExercises.length
      this.logger.log(`Lesson ${lessonId} has ${totalExercises} exercises`)

      // 3. Đếm số exercises riêng biệt đã COMPLETED của user trong lesson này
      // Chỉ đếm số exercises khác nhau, không đếm số lần làm lại
      const completedExerciseIds =
        await this.userExerciseAttemptRepository.findCompletedExercisesByLesson(
          userId,
          lessonId
        )
      const completedCount = completedExerciseIds.length
      this.logger.log(
        `User ${userId} has completed ${completedCount}/${totalExercises} unique exercises in lesson ${lessonId}`
      )

      // 4. Tính phần trăm hoàn thành
      const progressPercentage = Math.round((completedCount / totalExercises) * 100)
      this.logger.log(`Calculated progress percentage: ${progressPercentage}%`)

      // 5. Cập nhật UserProgress với status tương ứng
      await this.userProgressService.updateProgressByLesson(
        userId,
        lessonId,
        progressPercentage,
        progressStatus
      )

      this.logger.log(
        `Updated user progress for lesson ${lessonId}: ${progressPercentage}% with status ${progressStatus}`
      )
    } catch (error) {
      this.logger.error('Error updating user progress on exercise completion:', error)
      // Không throw error để không ảnh hưởng đến flow chính
    }
  }

  private async updateUserProgressOnStart(userId: number, exerciseId: number) {
    try {
      this.logger.log(
        `Updating user progress on start for exercise: ${exerciseId} for user: ${userId}`
      )

      // 1. Lấy thông tin Exercise để biết lessonId
      const exercise = await this.exercisesService.findById(exerciseId)
      if (!exercise) {
        this.logger.warn(`Exercise ${exerciseId} not found`)
        return
      }

      const lessonId = exercise.lessonId
      this.logger.log(`Exercise ${exerciseId} belongs to lesson ${lessonId}`)

      // 2. Cập nhật UserProgress status thành IN_PROGRESS
      await this.userProgressService.updateProgressByLesson(
        userId,
        lessonId,
        0,
        ProgressStatus.IN_PROGRESS
      )

      this.logger.log(
        `Updated UserProgress for user ${userId}, lesson ${lessonId} to IN_PROGRESS`
      )
    } catch (error) {
      this.logger.error('Error updating user progress on start:', error)
      // Không throw error để không ảnh hưởng đến flow chính
    }
  }
  //#endregion
}
