import { TEST_MESSAGE, USER_TEST_ATTEMPT_MESSAGE } from '@/common/constants/message'
import { calculateScore } from '@/common/utils/algorithm'
import { pickLabelFromComposite } from '@/common/utils/prase.utils'
import { I18nService } from '@/i18n/i18n.service'
import { UserTestAttemptMessage } from '@/i18n/message-keys'
import { LevelRepo } from '@/modules/level/level.repo'
import { QuestionBankService } from '@/modules/question-bank/question-bank.service'
import { TestRepository } from '@/modules/test/test.repo'
import { TestService } from '@/modules/test/test.service'
import { TestSetQuestionBankService } from '@/modules/testset-questionbank/testset-questionbank.service'
import { TestSetService } from '@/modules/testset/testset.service'
import { TranslationHelperService } from '@/modules/translation/translation.helper.service'
import { UserProgressRepository } from '@/modules/user-progress/user-progress.repo'
import { UserTestAnswerLogService } from '@/modules/user-test-answer-log/user-test-answer-log.service'
import {
  ForbiddenReviewAccessException,
  InvalidUserTestAttemptDataException,
  TestNotFoundException,
  UnauthorizedUserTestAttemptAccessException,
  UserTestAttemptNotFoundException
} from '@/modules/user-test-attempt/dto/user-test-attempt.error'
import {
  GetUserTestAttemptListQueryType,
  UpdateUserTestAttemptBodyType
} from '@/modules/user-test-attempt/entities/user-test-attempt.entities'
import { UserTestAttemptRepository } from '@/modules/user-test-attempt/user-test-attempt.repo'
import { UserTestRepository } from '@/modules/user-test/user-test.repo'
import { UserRepo } from '@/modules/user/user.repo'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { PrismaService } from '@/shared/services/prisma.service'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import { ProgressStatus, UserRewardSourceType } from '@prisma/client'
import { LessonRepository } from '../lesson/lesson.repo'
import { RewardService } from '../reward/reward.service'
import { REQUIRED_ANSWERS_FOR_LESSON_REVIEW } from './dto/variable'

@Injectable()
export class UserTestAttemptService {
  private readonly logger = new Logger(UserTestAttemptService.name)

  constructor(
    private readonly userTestAttemptRepository: UserTestAttemptRepository,
    private readonly userTestRepository: UserTestRepository,
    private readonly questionBankService: QuestionBankService,
    private readonly userTestAnswerLogService: UserTestAnswerLogService,
    private readonly testService: TestService,
    private readonly testRepo: TestRepository,
    private readonly testSetService: TestSetService,
    private readonly testSetQuestionBankService: TestSetQuestionBankService,
    private readonly translationHelper: TranslationHelperService,
    private readonly i18nService: I18nService,
    private readonly prisma: PrismaService,
    private readonly userRepo: UserRepo,
    private readonly levelRepo: LevelRepo,
    private readonly userProgressRepository: UserProgressRepository,
    private readonly rewardService: RewardService,
    private readonly lessonRepository: LessonRepository
  ) {}

  async create(userId: number, testId: number) {
    try {
      // 1. Lấy thông tin Test
      const testRes = await this.testService.findOne(testId, 'vi')
      if (!testRes || !testRes.data) {
        throw TestNotFoundException
      }

      const userTestAttempt = await this.userTestAttemptRepository.create({
        userId: userId,
        testId: testId
      })

      return {
        data: userTestAttempt,
        message: USER_TEST_ATTEMPT_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error creating user test attempt:', error)
      if (error instanceof HttpException) {
        throw error
      }
      throw InvalidUserTestAttemptDataException
    }
  }

  async findAll(query: GetUserTestAttemptListQueryType) {
    const { currentPage, pageSize, userId, testId, status } = query

    const result = await this.userTestAttemptRepository.findMany({
      currentPage,
      pageSize,
      userId,
      testId,
      status
    })

    return {
      statusCode: 200,
      message: USER_TEST_ATTEMPT_MESSAGE.GET_LIST_SUCCESS,
      data: {
        results: result.items,
        pagination: {
          current: result.page,
          pageSize: result.limit,
          totalPage: Math.ceil(result.total / result.limit),
          totalItem: result.total
        }
      }
    }
  }

  async findOne(id: number, lang: string) {
    const userTestAttempt = await this.userTestAttemptRepository.findUnique({
      id: id
    })

    if (!userTestAttempt) {
      throw UserTestAttemptNotFoundException
    }

    const message = this.i18nService.translate(
      USER_TEST_ATTEMPT_MESSAGE.GET_SUCCESS,
      lang || 'vi'
    )

    return {
      statusCode: 200,
      data: userTestAttempt,
      message: message || USER_TEST_ATTEMPT_MESSAGE.GET_SUCCESS
    }
  }

  async update(id: number, body: UpdateUserTestAttemptBodyType) {
    try {
      const userTestAttempt = await this.userTestAttemptRepository.update({ id }, body)

      return {
        data: userTestAttempt,
        message: USER_TEST_ATTEMPT_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error updating user test attempt:', error)
      if (
        error instanceof HttpException ||
        error.message?.includes('không tồn tại') ||
        error.message?.includes('đã tồn tại')
      ) {
        throw error
      }
      throw InvalidUserTestAttemptDataException
    }
  }

  async remove(id: number) {
    try {
      const userTestAttempt = await this.userTestAttemptRepository.delete({ id })

      return {
        data: userTestAttempt,
        message: USER_TEST_ATTEMPT_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error deleting user test attempt:', error)
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidUserTestAttemptDataException
    }
  }

  async checkTestCompletion(
    userTestAttemptId: number,
    userId: number,
    languageCode: string = 'vi'
  ) {
    try {
      this.logger.log(`Checking completion for user test attempt: ${userTestAttemptId}`)

      // 1. Lấy thông tin UserTestAttempt
      const attempt = await this.userTestAttemptRepository.findById(userTestAttemptId)
      if (!attempt) {
        throw UserTestAttemptNotFoundException
      }

      // 2. Lấy thông tin Test để biết các TestSets
      const testRes = await this.testService.findOne(attempt.testId, 'vi')
      if (!testRes || !testRes.data) {
        throw TestNotFoundException
      }

      // Lấy testType từ testRes
      const testType = (testRes.data as any).testType

      // 3. Lấy tất cả TestSets của Test
      const test = await this.prisma.test.findUnique({
        where: { id: attempt.testId },
        include: {
          testTestSets: {
            select: {
              testSet: {
                select: { id: true }
              }
            }
          }
        }
      })

      if (!test || !test.testTestSets || test.testTestSets.length === 0) {
        throw new Error('Test không có test set nào')
      }

      const testSetIds = test.testTestSets.map((tts) => tts.testSet.id)

      // 4. Lấy tất cả QuestionBanks từ tất cả TestSets
      const allQuestionBanks: any[] = []
      for (const testSetId of testSetIds) {
        const questionsResult = await this.testSetQuestionBankService.findFullByTestSetId(
          testSetId,
          'vi'
        )
        if (questionsResult.data && Array.isArray(questionsResult.data)) {
          allQuestionBanks.push(...questionsResult.data)
        }
      }

      this.logger.log(
        `Found ${allQuestionBanks.length} questions for test ${attempt.testId}`
      )

      // 5. Lấy tất cả UserTestAnswerLog của attempt này
      const answerLogsResult =
        await this.userTestAnswerLogService.findByUserTestAttemptId(userTestAttemptId)
      const userAnswers = answerLogsResult.data.results
      this.logger.log(
        `Found ${userAnswers.length} user answers for attempt ${userTestAttemptId}`
      )

      // 6. Kiểm tra xem đã trả lời đủ chưa
      const answeredQuestionIds = new Set(
        userAnswers.map((log) => (log as any).questionBankId)
      )
      const unansweredQuestions = allQuestionBanks.filter(
        (q) => !answeredQuestionIds.has(q.questionBankId)
      )

      // Xử lý riêng cho LESSON_REVIEW: chỉ cần 10 câu
      const isLessonReview = testType === 'LESSON_REVIEW'

      if (isLessonReview) {
        const answeredCount = userAnswers.length

        if (answeredCount < REQUIRED_ANSWERS_FOR_LESSON_REVIEW) {
          this.logger.log(
            `LESSON_REVIEW: Still need ${REQUIRED_ANSWERS_FOR_LESSON_REVIEW - answeredCount} more answers (answered: ${answeredCount}/${REQUIRED_ANSWERS_FOR_LESSON_REVIEW})`
          )
          const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'
          const message = this.i18nService.translate(
            UserTestAttemptMessage.NOT_ENOUGH_ANSWERS,
            normalizedLang
          )
          return {
            statusCode: 200,
            message: message,
            data: {
              isCompleted: false,
              totalQuestions: REQUIRED_ANSWERS_FOR_LESSON_REVIEW,
              answeredQuestions: answeredCount,
              unansweredQuestions: REQUIRED_ANSWERS_FOR_LESSON_REVIEW - answeredCount,
              unansweredQuestionIds: unansweredQuestions.map((q) => q.questionBankId),
              allCorrect: false,
              status: 'IN_PROGRESS'
            }
          }
        }
        // Nếu đã trả lời đủ 10 câu, tiếp tục kiểm tra đúng/sai
      } else {
        // Với các test type khác: phải trả lời hết tất cả câu hỏi
        if (unansweredQuestions.length > 0) {
          this.logger.log(`Still ${unansweredQuestions.length} unanswered questions`)
          const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'
          const message = this.i18nService.translate(
            UserTestAttemptMessage.NOT_ENOUGH_ANSWERS,
            normalizedLang
          )
          return {
            statusCode: 200,
            message: message,
            data: {
              isCompleted: false,
              totalQuestions: allQuestionBanks.length,
              answeredQuestions: userAnswers.length,
              unansweredQuestions: unansweredQuestions.length,
              unansweredQuestionIds: unansweredQuestions.map((q) => q.questionBankId),
              allCorrect: false,
              status: 'IN_PROGRESS'
            }
          }
        }
      }

      // 7. Kiểm tra xem tất cả câu trả lời có đúng không
      const allCorrect = userAnswers.every((log) => log.isCorrect)

      // 8. Chỉ trả kết quả, KHÔNG cập nhật DB trong hàm check
      const finalStatus = allCorrect ? 'COMPLETED' : 'FAILED'
      const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'
      const message = allCorrect
        ? this.i18nService.translate(
            UserTestAttemptMessage.TEST_COMPLETED_ALL_CORRECT,
            normalizedLang
          )
        : this.i18nService.translate(
            UserTestAttemptMessage.TEST_COMPLETED_SOME_WRONG,
            normalizedLang
          )

      // Với LESSON_REVIEW, totalQuestions luôn là 10
      const totalQuestions = isLessonReview
        ? REQUIRED_ANSWERS_FOR_LESSON_REVIEW
        : allQuestionBanks.length

      return {
        statusCode: 200,
        message: message,
        data: {
          isCompleted: true,
          totalQuestions: totalQuestions,
          answeredQuestions: userAnswers.length,
          unansweredQuestions: 0,
          allCorrect: allCorrect,
          status: finalStatus
        }
      }
    } catch (error) {
      this.logger.error('Error checking test completion:', error)
      throw error
    }
  }

  //KUMO new logic update userProgress nữa
  async submitTestCompletion(
    userTestAttemptId: number,
    userId: number,
    timeSeconds?: number
  ) {
    try {
      this.logger.log(`Submitting completion for user test attempt: ${userTestAttemptId}`)

      // 1. Lấy thông tin UserTestAttempt
      const attempt = await this.userTestAttemptRepository.findById(userTestAttemptId)
      if (!attempt) {
        throw UserTestAttemptNotFoundException
      }

      // 2. Kiểm tra xem attempt có thuộc về user này không
      if (attempt.userId !== userId) {
        throw UnauthorizedUserTestAttemptAccessException
      }

      // 3. Lấy thông tin Test để biết testType
      const testRes = await this.testService.findOne(attempt.testId, 'vi')
      if (!testRes || !testRes.data) {
        throw TestNotFoundException
      }

      const testType = (testRes.data as any).testType

      // 5. Lấy tất cả UserTestAnswerLog của attempt này
      const answerLogsResult =
        await this.userTestAnswerLogService.findByUserTestAttemptId(userTestAttemptId)
      const userAnswers = answerLogsResult.data.results

      // Xử lý riêng cho LESSON_REVIEW test
      if (testType === 'LESSON_REVIEW') {
        // Với LESSON_REVIEW: mặc định 10 câu là đủ, không cần kiểm tra unansweredQuestions
        const expectedQuestionCount = 10

        // Nếu không có câu trả lời nào mà vẫn nộp bài, coi như FAILED
        if (userAnswers.length === 0) {
          const newStatus = 'FAILED'
          const message = 'Bạn đã nộp bài nhưng chưa trả lời câu hỏi nào'

          await this.userTestAttemptRepository.update(
            { id: userTestAttemptId },
            {
              status: newStatus,
              ...(timeSeconds !== undefined ? { time: timeSeconds } : {})
            }
          )
          this.logger.log(
            `Updated attempt ${userTestAttemptId} to ${newStatus} - no answers provided`
          )

          // Cập nhật UserProgress status thành TESTING_LAST_FAILED
          await this.updateUserProgressOnLessonReviewFailure(userId, attempt.testId)

          return {
            statusCode: 200,
            message: message,
            data: {
              isCompleted: true,
              totalQuestions: expectedQuestionCount,
              answeredQuestions: 0,
              unansweredQuestions: expectedQuestionCount,
              allCorrect: false,
              status: newStatus
            }
          }
        }

        // Tính điểm số (số câu đúng / số câu đã trả lời * 100)
        const correctCount = userAnswers.filter((log) => log.isCorrect).length
        const score = Math.round((correctCount / userAnswers.length) * 100)

        // Kiểm tra xem tất cả câu trả lời có đúng không
        const allCorrect = userAnswers.every((log) => log.isCorrect)

        // Update status dựa trên kết quả: >= 80% là COMPLETED
        let newStatus: string
        let message: string

        if (score >= 80) {
          newStatus = 'COMPLETED'
          message = 'Chúc mừng! Bạn đã hoàn thành bài test'
        } else {
          newStatus = 'FAILED'
          message = 'Bạn đã hoàn thành bài test nhưng chưa đạt yêu cầu (cần >= 80%)'
        }

        // Update status và score trong database
        await this.userTestAttemptRepository.update(
          { id: userTestAttemptId },
          {
            status: newStatus,
            score,
            ...(timeSeconds !== undefined ? { time: timeSeconds } : {})
          }
        )
        this.logger.log(
          `Updated attempt ${userTestAttemptId} to ${newStatus} with score ${score}`
        )

        let rewardResults: any = null

        // Cập nhật UserProgress dựa trên kết quả
        if (newStatus === 'COMPLETED') {
          // Lấy lessonId từ testId
          const lessonId = await this.lessonRepository.findByTestId(attempt.testId)
          // Nếu hoàn thành (score >= 80%), trao phần thưởng từ lesson trước khi update status
          // (cần check status trước khi update để biết có phải lần đầu hoàn thành không)
          rewardResults = await this.grantTestRewards(
            attempt.testId,
            userId,
            lessonId?.id
          )
          // Sau đó update status thành COMPLETED
          await this.updateUserProgressOnLessonReviewCompletion(userId, attempt.testId)
        } else if (newStatus === 'FAILED') {
          // Nếu fail (score < 80%), update status thành TESTING_LAST_FAILED
          await this.updateUserProgressOnLessonReviewFailure(userId, attempt.testId)
        }

        return {
          statusCode: 200,
          message: message,
          data: {
            isCompleted: true,
            totalQuestions: userAnswers.length, // Số câu đã trả lời
            answeredQuestions: userAnswers.length,
            unansweredQuestions: 0,
            allCorrect: allCorrect,
            status: newStatus,
            score: score,
            rewards: rewardResults
          }
        }
      }

      // Logic cho các test type khác (giữ nguyên)
      // 3. Lấy tất cả TestSets của Test
      const test = await this.prisma.test.findUnique({
        where: { id: attempt.testId },
        include: {
          testTestSets: {
            select: {
              testSet: {
                select: { id: true }
              }
            }
          }
        }
      })

      if (!test || !test.testTestSets || test.testTestSets.length === 0) {
        throw new Error('Test không có test set nào')
      }

      const testSetIds = test.testTestSets.map((tts) => tts.testSet.id)

      // 4. Lấy tất cả QuestionBanks từ tất cả TestSets
      const allQuestionBanks: any[] = []
      for (const testSetId of testSetIds) {
        const questionsResult = await this.testSetQuestionBankService.findFullByTestSetId(
          testSetId,
          'vi'
        )
        if (questionsResult.data && Array.isArray(questionsResult.data)) {
          allQuestionBanks.push(...questionsResult.data)
        }
      }

      // 6. Kiểm tra xem đã trả lời hết chưa
      const answeredQuestionIds = new Set(
        userAnswers.map((log) => (log as any).questionBankId)
      )
      const unansweredQuestions = allQuestionBanks.filter(
        (q) => !answeredQuestionIds.has(q.questionBankId)
      )

      // Nếu không có câu trả lời nào mà vẫn nộp bài, coi như FAILED
      if (userAnswers.length === 0) {
        const newStatus = 'FAILED'
        const message = 'Bạn đã nộp bài nhưng chưa trả lời câu hỏi nào'

        await this.userTestAttemptRepository.update(
          { id: userTestAttemptId },
          {
            status: newStatus,
            ...(timeSeconds !== undefined ? { time: timeSeconds } : {})
          }
        )
        this.logger.log(
          `Updated attempt ${userTestAttemptId} to ${newStatus} - no answers provided`
        )

        return {
          statusCode: 200,
          message: message,
          data: {
            isCompleted: true,
            totalQuestions: allQuestionBanks.length,
            answeredQuestions: 0,
            unansweredQuestions: allQuestionBanks.length,
            unansweredQuestionIds: allQuestionBanks.map((q) => q.questionBankId),
            allCorrect: false,
            status: newStatus
          }
        }
      }

      // Nếu chưa trả lời hết, coi như FAILED
      if (unansweredQuestions.length > 0) {
        const newStatus = 'FAILED'
        const message = 'Bạn đã nộp bài nhưng chưa trả lời đủ câu hỏi'

        await this.userTestAttemptRepository.update(
          { id: userTestAttemptId },
          {
            status: newStatus,
            ...(timeSeconds !== undefined ? { time: timeSeconds } : {})
          }
        )
        this.logger.log(
          `Updated attempt ${userTestAttemptId} to ${newStatus} - incomplete answers`
        )

        return {
          statusCode: 200,
          message: message,
          data: {
            isCompleted: true,
            totalQuestions: allQuestionBanks.length,
            answeredQuestions: userAnswers.length,
            unansweredQuestions: unansweredQuestions.length,
            unansweredQuestionIds: unansweredQuestions.map((q) => q.questionBankId),
            allCorrect: false,
            status: newStatus
          }
        }
      }

      // 7. Kiểm tra xem tất cả câu trả lời có đúng không
      const allCorrect = userAnswers.every((log) => log.isCorrect)

      // 8. Tính điểm số (số câu đúng / tổng số câu * 100)
      const score = Math.round(
        (userAnswers.filter((log) => log.isCorrect).length / allQuestionBanks.length) *
          100
      )

      // 9. Update status dựa trên kết quả
      let newStatus: string
      let message: string

      if (allCorrect) {
        newStatus = 'COMPLETED'
        message = 'Chúc mừng! Bạn đã hoàn thành bài test và trả lời đúng hết'
      } else {
        newStatus = 'FAILED'
        message = 'Bạn đã hoàn thành bài test nhưng có một số câu trả lời sai'
      }

      // Update status và score trong database
      await this.userTestAttemptRepository.update(
        { id: userTestAttemptId },
        {
          status: newStatus,
          score,
          ...(timeSeconds !== undefined ? { time: timeSeconds } : {})
        }
      )
      this.logger.log(
        `Updated attempt ${userTestAttemptId} to ${newStatus} with score ${score}`
      )

      return {
        statusCode: 200,
        message: message,
        data: {
          isCompleted: true,
          totalQuestions: allQuestionBanks.length,
          answeredQuestions: userAnswers.length,
          unansweredQuestions: 0,
          allCorrect: allCorrect,
          status: newStatus,
          score: score
        }
      }
    } catch (error) {
      this.logger.error('Error submitting test completion:', error)
      throw error
    }
  }

  async abandon(userTestAttemptId: number, userId: number, timeSeconds?: number) {
    try {
      this.logger.log(
        `Abandoning user test attempt: ${userTestAttemptId} for user: ${userId}`
      )

      // 1. Lấy thông tin UserTestAttempt
      const attempt = await this.userTestAttemptRepository.findById(userTestAttemptId)
      if (!attempt) {
        throw UserTestAttemptNotFoundException
      }

      // 2. Kiểm tra xem attempt có thuộc về user này không
      if (attempt.userId !== userId) {
        throw UnauthorizedUserTestAttemptAccessException
      }

      // 3. Kiểm tra xem attempt có đang IN_PROGRESS không
      if (attempt.status !== 'IN_PROGRESS') {
        return {
          statusCode: 400,
          message: 'Chỉ có thể bỏ dở bài test đang trong trạng thái IN_PROGRESS',
          data: attempt
        }
      }

      // 4. Update status thành ABANDONED
      const updatedAttempt = await this.userTestAttemptRepository.update(
        { id: userTestAttemptId },
        {
          status: 'ABANDONED',
          ...(timeSeconds !== undefined ? { time: timeSeconds } : {})
        }
      )

      this.logger.log(`Updated attempt ${userTestAttemptId} to ABANDONED`)

      return {
        statusCode: 200,
        message: 'Đã đánh dấu bài test là bỏ dở',
        data: updatedAttempt
      }
    } catch (error) {
      this.logger.error('Error abandoning test attempt:', error)
      throw error
    }
  }

  async getStatus(userTestAttemptId: number, userId: number, lang: string) {
    try {
      this.logger.log(
        `Getting status for user test attempt: ${userTestAttemptId} for user: ${userId}`
      )

      // 1. Lấy thông tin UserTestAttempt
      const attempt = await this.userTestAttemptRepository.findById(userTestAttemptId)
      if (!attempt) {
        throw UserTestAttemptNotFoundException
      }

      // 2. Kiểm tra xem attempt có thuộc về user này không
      if (attempt.userId !== userId) {
        throw UnauthorizedUserTestAttemptAccessException
      }

      const message = this.i18nService.translate(
        USER_TEST_ATTEMPT_MESSAGE.GET_STATUS_SUCCESS,
        lang || 'vi'
      )

      return {
        statusCode: 200,
        message: message || USER_TEST_ATTEMPT_MESSAGE.GET_STATUS_SUCCESS,
        data: attempt
      }
    } catch (error) {
      this.logger.error('Error getting test attempt status:', error)
      throw error
    }
  }

  async getTestAttemptByTestId(
    testId: number,
    userId: number,
    languageCode: string
  ): Promise<MessageResDTO | null> {
    try {
      const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'

      // Kiểm tra và giảm limit của UserTest
      const userTest = await this.userTestRepository.findByUserAndTest(userId, testId)
      if (!userTest) {
        const message = this.i18nService.translate(
          UserTestAttemptMessage.USER_TEST_NOT_FOUND,
          normalizedLang
        )
        throw new HttpException(message || 'Không tìm thấy UserTest', 400)
      }

      // Kiểm tra limit (null, undefined, hoặc 0 được coi như không giới hạn)
      // Chỉ throw error khi limit < 0 (âm số) hoặc limit > 0 nhưng đã hết lượt (cần check riêng)
      // Logic này phải nhất quán với decrementLimit: limit = 0 được coi là "không giới hạn"
      if (userTest.limit !== null && userTest.limit !== undefined && userTest.limit < 0) {
        const message = this.i18nService.translate(
          UserTestAttemptMessage.OUT_OF_LIMIT,
          normalizedLang
        )
        throw new HttpException(message || 'Bạn đã hết lượt làm bài test này', 400)
      }

      // Tìm attempt IN_PROGRESS gần nhất của user với test này
      const inProgressAttempt = await this.prisma.userTestAttempt.findFirst({
        where: {
          userId,
          testId,
          status: 'IN_PROGRESS'
        },
        orderBy: {
          createdAt: 'desc' // Lấy attempt được tạo gần nhất
        }
      })

      let attempt: any
      let userTestAttemptId: number

      if (inProgressAttempt) {
        // Kiểm tra thời gian: nếu attempt được tạo/update hơn 1 tiếng trước → ABANDONED và tạo mới
        const now = new Date()
        const attemptTime = inProgressAttempt.updatedAt || inProgressAttempt.createdAt
        const timeDiffMs = now.getTime() - attemptTime.getTime()
        const oneHourMs = 60 * 60 * 1000 // 1 tiếng = 3,600,000ms //KUMO

        if (timeDiffMs > oneHourMs) {
          // Quá 1 tiếng → đánh dấu ABANDONED và tạo mới
          this.logger.log(
            `Attempt ${inProgressAttempt.id} is older than 1 hour (${Math.round(timeDiffMs / (60 * 1000))} minutes), marking as ABANDONED and creating new one`
          )
          await this.prisma.userTestAttempt.update({
            where: { id: inProgressAttempt.id },
            data: { status: 'ABANDONED' }
          })

          // Giảm limit và tạo attempt mới
          await this.userTestRepository.decrementLimit(userId, testId)
          const createAttempt = await this.create(userId, testId)
          attempt = createAttempt.data as any
          userTestAttemptId = attempt.id
        } else {
          // Dưới 1 tiếng → reuse và update updatedAt
          this.logger.log(
            `Found existing IN_PROGRESS attempt (ID: ${inProgressAttempt.id}) for user ${userId} and test ${testId}, reusing it (age: ${Math.round(timeDiffMs / (60 * 1000))} minutes)`
          )

          // Update updatedAt để reset timer
          await this.prisma.userTestAttempt.update({
            where: { id: inProgressAttempt.id },
            data: { updatedAt: now }
          })

          attempt = await this.userTestAttemptRepository.findById(inProgressAttempt.id)
          if (!attempt) {
            throw UserTestAttemptNotFoundException
          }
          userTestAttemptId = attempt.id
        }
      } else {
        // Nếu không có IN_PROGRESS (có thể là ABANDONED, COMPLETED, FAILED hoặc chưa có) → tạo mới
        this.logger.log(
          `No IN_PROGRESS attempt found for user ${userId} and test ${testId}, creating new attempt`
        )

        // Giảm limit trước khi cho phép làm bài (chỉ khi tạo mới)
        await this.userTestRepository.decrementLimit(userId, testId)

        const createAttempt = await this.create(userId, testId)
        attempt = createAttempt.data as any
        userTestAttemptId = attempt.id
      }

      // Lấy thông tin Test với các TestSets
      const testRes = await this.testService.findOne(testId, languageCode)
      const test = await this.testRepo.findByIdWithTestSetsAndQuestions(testId)

      if (!test || !test.testTestSets || test.testTestSets.length === 0) {
        throw new Error('Test không có test set nào')
      }

      // Load user answer logs (nếu reuse attempt IN_PROGRESS thì có thể đã có logs)
      let answeredCount = 0
      let userAnswerLogs: any[] = []
      const answerLogsResult =
        await this.userTestAnswerLogService.findByUserTestAttemptId(userTestAttemptId)
      if (answerLogsResult?.data?.results) {
        userAnswerLogs = answerLogsResult.data.results
        answeredCount = userAnswerLogs.length
        this.logger.log(
          `Found ${answeredCount} existing answer logs for attempt ${userTestAttemptId}`
        )
      }

      // Tạo map để check xem question nào đã được trả lời và câu trả lời là gì
      const answeredQuestionMap = new Map<number, number>() // questionBankId -> answerId
      userAnswerLogs.forEach((log: any) => {
        answeredQuestionMap.set(log.questionBankId, log.answerId)
      })

      // Xử lý các TestSets và Questions
      const allTestSets: any[] = []
      let totalQuestions = 0

      for (const testTestSet of test.testTestSets) {
        const testSet = testTestSet.testSet
        const testSetData: any = {
          id: testSet.id,
          name: testSet.name,
          description: testSet.description,
          content: testSet.content, // Cho READING type
          audioUrl: testSet.audioUrl, // Cho LISTENING type
          testType: testSet.testType,
          testSetQuestionBanks: []
        }

        // Map questions với translations
        const mappedBanks = await Promise.all(
          testSet.testSetQuestionBanks.map(async (item: any) => {
            const qb = item.questionBank
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
              questionText = qb?.questionJp || ''
            }

            const mappedAnswers = await Promise.all(
              (qb?.answers || []).map(async (ans: any) => {
                let answerLabel = pickLabelFromComposite(
                  ans?.answerJp || '',
                  normalizedLang
                )
                // Loại bỏ prefix "jp:" nếu có
                if (answerLabel.startsWith('jp:')) {
                  answerLabel = answerLabel.replace(/^jp:\s*/, '')
                }
                return {
                  id: ans.id,
                  answer: answerLabel
                }
              })
            )

            totalQuestions++

            // Kiểm tra xem user đã trả lời câu này chưa (khi reuse attempt IN_PROGRESS)
            const userSelectedAnswerId = answeredQuestionMap.get(qb?.id)

            return {
              id: item.id,
              questionOrder: item.questionOrder,
              questionBank: {
                id: qb?.id,
                question: questionText,
                questionType: qb?.questionType,
                audioUrl: qb?.audioUrl,
                pronunciation: qb?.pronunciation,
                answers: mappedAnswers,
                selectedAnswerId: userSelectedAnswerId || undefined // ID câu trả lời đã chọn (nếu có)
              }
            }
          })
        )

        testSetData.testSetQuestionBanks = mappedBanks
        allTestSets.push(testSetData)
      }

      this.logger.log(
        `Getting test attempt for user ${userId} in test ${testId}, using attempt ${userTestAttemptId} with status ${attempt?.status}`
      )

      const message = this.i18nService.translate(TEST_MESSAGE.GET_SUCCESS, normalizedLang)

      return {
        statusCode: 200,
        data: {
          id: test.id,
          name: testRes.data.name,
          description: testRes.data.description,
          testType: test.testType,
          testSets: allTestSets,
          userTestAttemptId,
          totalQuestions,
          answeredQuestions: answeredCount,
          time: Number(attempt?.time ?? 0)
        },
        message: message || TEST_MESSAGE.GET_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error getting test attempt by test id:', error)
      if (error instanceof HttpException) {
        throw error
      }
      throw error
    }
  }

  async getTestAttemptReview(
    id: number,
    userId: number,
    languageCode: string
  ): Promise<MessageResDTO> {
    try {
      const attemptRes = await this.findOne(id, languageCode)
      const attempt = attemptRes.data as any

      // Kiểm tra attempt có thuộc về user này không
      if ((attempt as any)?.userId !== userId) {
        throw ForbiddenReviewAccessException
      }

      const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'

      // Only build review when attempt is COMPLETED or FAILED
      if (attempt.status !== 'COMPLETED' && attempt.status !== 'FAILED') {
        return {
          statusCode: 200,
          message: this.i18nService.translate(
            UserTestAttemptMessage.REVIEW_NOT_COMPLETED,
            normalizedLang
          ),
          data: { status: attempt.status }
        }
      }

      // Lấy thông tin Test với các TestSets
      const test = await this.testRepo.findByIdWithTestSetsAndQuestions(attempt.testId)

      if (!test || !test.testTestSets || test.testTestSets.length === 0) {
        throw new Error('Test không có test set nào')
      }

      // Xác định test type từ attempt (nếu có) hoặc từ test object đã query
      // attempt.test có thể có nếu findOne include test, nếu không thì dùng test.testType
      const testType =
        attempt.test && attempt.test.testType ? attempt.test.testType : test.testType

      // Load user answer logs for this attempt
      const logsRes = await this.userTestAnswerLogService.findByUserTestAttemptId(id)
      let logs: Array<{ questionBankId: number; answerId: number; isCorrect: boolean }> =
        (logsRes?.data?.results || []) as any

      // Nếu test type là PLACEMENT_TEST_DONE, chỉ lấy 10 câu đầu tiên từ logs (những câu đã làm)
      const isPlacementTestDone = testType === 'PLACEMENT_TEST_DONE'
      if (isPlacementTestDone) {
        const originalLogsCount = logs.length
        if (logs.length > 10) {
          logs = logs.slice(0, 10)
          this.logger.log(
            `PLACEMENT_TEST_DONE: Limiting review to first 10 questions from ${originalLogsCount} total logs`
          )
        } else {
          this.logger.log(
            `PLACEMENT_TEST_DONE: Using all ${logs.length} questions from logs`
          )
        }
      }

      const selectedByQuestion = new Map<number, number>(
        logs.map((l) => [Number(l.questionBankId), Number(l.answerId)])
      )

      // Tính tỷ lệ đúng trước khi xử lý review
      // Nếu là PLACEMENT_TEST_DONE, chỉ tính số câu trong logs (đã giới hạn 10)
      // Nếu không phải, tính tổng số câu trong test
      let totalQuestions = 0
      if (isPlacementTestDone) {
        totalQuestions = logs.length // Số câu đã làm trong logs (tối đa 10)
      } else {
        for (const testTestSet of test.testTestSets) {
          totalQuestions += testTestSet.testSet.testSetQuestionBanks.length
        }
      }

      const answeredCorrectCount = logs.filter((l: any) => l.isCorrect).length
      const correctPercentage =
        totalQuestions > 0 ? (answeredCorrectCount / totalQuestions) * 100 : 0

      // Kiểm tra xem test này có ít nhất 1 lần làm COMPLETED không
      const hasCompletedAttempt =
        await this.userTestAttemptRepository.hasCompletedAttempt(userId, attempt.testId)

      // Logic kiểm tra quyền xem review:
      // - Nếu test có ít nhất 1 lần làm COMPLETED → được quyền xem (không cần đúng 80%)
      // - Nếu chưa có lần nào COMPLETED → phải đúng >= 80% mới được xem
      if (!hasCompletedAttempt && correctPercentage < 80) {
        return {
          statusCode: 403,
          message: this.i18nService.translate(
            UserTestAttemptMessage.REVIEW_INSUFFICIENT_SCORE,
            normalizedLang
          ),
          data: {
            status: attempt.status,
            totalQuestions,
            answeredCorrect: answeredCorrectCount,
            correctPercentage: Math.round(correctPercentage),
            minimumRequired: 80
          }
        }
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

      const allTestSets: any[] = []
      let answeredCorrect = 0
      let answeredInCorrect = 0

      // Nếu là PLACEMENT_TEST_DONE, chỉ xử lý 10 câu đầu tiên
      const allowedQuestionBankIds = isPlacementTestDone
        ? new Set(logs.map((l: any) => Number(l.questionBankId)))
        : null
      // Map để lưu thứ tự của questionBankId trong logs (cho PLACEMENT_TEST_DONE)
      const questionOrderMap = isPlacementTestDone
        ? new Map(logs.map((l: any, index: number) => [Number(l.questionBankId), index]))
        : null

      for (const testTestSet of test.testTestSets) {
        const testSet = testTestSet.testSet
        const testSetData: any = {
          id: testSet.id,
          name: testSet.name,
          description: testSet.description,
          content: testSet.content,
          audioUrl: testSet.audioUrl,
          testType: testSet.testType,
          testSetQuestionBanks: []
        }

        // Lọc testSetQuestionBanks nếu là PLACEMENT_TEST_DONE
        let questionBanksToProcess = testSet.testSetQuestionBanks
        if (isPlacementTestDone && allowedQuestionBankIds) {
          questionBanksToProcess = testSet.testSetQuestionBanks.filter((item: any) =>
            allowedQuestionBankIds.has(item.questionBank?.id)
          )
        }

        let mappedBanks = await Promise.all(
          questionBanksToProcess.map(async (item: any) => {
            const qb = item.questionBank
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

            // Build full answer list; mark correct and user-selected incorrect
            const reviewAnswers: any[] = []
            const toShortLabel = (text: string): string => {
              if (!text) return ''
              const match = text.match(/"([^"]+)"/)
              if (match && match[1]) return match[1].trim()
              return text.trim()
            }
            for (const a of answers) {
              const label = toShortLabel(
                pickLabelFromComposite(a?.answerJp || '', normalizedLang)
              )
              const explanation = await translateOrFallback(a?.answerKey, a?.answerJp)
              let entry: any = { id: a.id, answer: label }
              if (correct && a.id === correct.id) {
                entry.type = 'correct_answer'
                entry.explantion = explanation
              } else if (
                userSelectedId &&
                a.id === userSelectedId &&
                (!correct || userSelectedId !== correct.id)
              ) {
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

        // Nếu là PLACEMENT_TEST_DONE, sắp xếp lại theo thứ tự trong logs
        if (isPlacementTestDone && questionOrderMap) {
          mappedBanks = mappedBanks.sort((a, b) => {
            const orderA = questionOrderMap.get(a.questionBank.id) ?? Infinity
            const orderB = questionOrderMap.get(b.questionBank.id) ?? Infinity
            return orderA - orderB
          })
        }

        testSetData.testSetQuestionBanks = mappedBanks
        allTestSets.push(testSetData)
      }

      // Đảm bảo cho PLACEMENT_TEST_DONE: chỉ hiển thị đúng 10 câu đã làm
      if (isPlacementTestDone) {
        // Đếm tổng số câu hỏi trong tất cả testSets
        let totalQuestionsInReview = 0
        for (const testSet of allTestSets) {
          totalQuestionsInReview += testSet.testSetQuestionBanks.length
        }

        // Nếu vượt quá 10, chỉ lấy 10 câu đầu tiên theo thứ tự trong logs
        if (totalQuestionsInReview > 10) {
          this.logger.warn(
            `PLACEMENT_TEST_DONE: Found ${totalQuestionsInReview} questions in review, limiting to 10`
          )

          // Lấy 10 questionBankId đầu tiên từ logs
          const first10QuestionBankIds = logs
            .slice(0, 10)
            .map((l: any) => Number(l.questionBankId))
          const first10Set = new Set(first10QuestionBankIds)

          // Lọc lại tất cả testSets chỉ giữ 10 câu đầu tiên
          for (const testSet of allTestSets) {
            testSet.testSetQuestionBanks = testSet.testSetQuestionBanks
              .filter((item: any) => first10Set.has(item.questionBank.id))
              .sort((a: any, b: any) => {
                const indexA = first10QuestionBankIds.indexOf(a.questionBank.id)
                const indexB = first10QuestionBankIds.indexOf(b.questionBank.id)
                return indexA - indexB
              })
          }

          // Cập nhật lại totalQuestions và các thống kê từ 10 câu đầu tiên trong logs
          totalQuestions = 10
          answeredCorrect = logs.filter((l: any) => l.isCorrect).length
          answeredInCorrect = logs.filter((l: any) => !l.isCorrect).length

          this.logger.log(
            `PLACEMENT_TEST_DONE: Final review contains ${totalQuestions} questions (${answeredCorrect} correct, ${answeredInCorrect} incorrect)`
          )
        } else {
          this.logger.log(
            `PLACEMENT_TEST_DONE: Review contains ${totalQuestionsInReview} questions (as expected)`
          )
        }
      }

      const testRes = await this.testService.findOne(attempt.testId, normalizedLang)

      // Tính score: (số câu đúng / tổng số câu) * 100, max 100 điểm
      // totalQuestions đã được tính đúng: logs.length cho PLACEMENT_TEST_DONE, hoặc tổng số câu trong test
      const score = calculateScore(answeredCorrect, totalQuestions)

      const data = {
        id: test.id,
        name: testRes.data.name,
        description: testRes.data.description,
        testType: test.testType,
        testSets: allTestSets,
        totalQuestions,
        answeredCorrect,
        answeredInCorrect,
        score,
        time: Number((attempt as any)?.time ?? 0),
        status: (attempt as any)?.status
      }

      return {
        statusCode: 200,
        message: this.i18nService.translate(
          UserTestAttemptMessage.REVIEW_SUCCESS,
          normalizedLang
        ),
        data
      }
    } catch (error) {
      this.logger.error('Error building test attempt review:', error)
      if (error instanceof HttpException) {
        throw error
      }
      throw error
    }
  }

  async getLessonTestAttemptReview(
    id: number,
    userId: number,
    languageCode: string
  ): Promise<MessageResDTO> {
    try {
      const attemptRes = await this.findOne(id, languageCode)
      const attempt = attemptRes.data as any

      // Kiểm tra attempt có thuộc về user này không
      if ((attempt as any)?.userId !== userId) {
        throw ForbiddenReviewAccessException
      }

      const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'

      // Only build review when attempt is COMPLETED or FAILED
      if (attempt.status !== 'COMPLETED' && attempt.status !== 'FAILED') {
        return {
          statusCode: 200,
          message: this.i18nService.translate(
            UserTestAttemptMessage.REVIEW_NOT_COMPLETED,
            normalizedLang
          ),
          data: { status: attempt.status }
        }
      }

      // Load user answer logs for this attempt
      const logsRes = await this.userTestAnswerLogService.findByUserTestAttemptId(id)
      const logs: Array<{
        questionBankId: number
        answerId: number
        isCorrect: boolean
        turnNumber?: number
      }> = (logsRes?.data?.results || []) as any

      if (!logs || logs.length === 0) {
        throw new Error('Không tìm thấy câu trả lời cho lần làm bài này')
      }

      // Tính tỷ lệ đúng
      const totalQuestions = logs.length
      const answeredCorrectCount = logs.filter((l: any) => l.isCorrect).length
      const correctPercentage =
        totalQuestions > 0 ? (answeredCorrectCount / totalQuestions) * 100 : 0

      // Kiểm tra xem test này có ít nhất 1 lần làm COMPLETED không
      const hasCompletedAttempt =
        await this.userTestAttemptRepository.hasCompletedAttempt(userId, attempt.testId)

      // Logic kiểm tra quyền xem review:
      // - Nếu test có ít nhất 1 lần làm COMPLETED → được quyền xem (không cần đúng 80%)
      // - Nếu chưa có lần nào COMPLETED → phải đúng >= 80% mới được xem
      if (!hasCompletedAttempt && correctPercentage < 80) {
        return {
          statusCode: 403,
          message: this.i18nService.translate(
            UserTestAttemptMessage.REVIEW_INSUFFICIENT_SCORE,
            normalizedLang
          ),
          data: {
            status: attempt.status,
            totalQuestions,
            answeredCorrect: answeredCorrectCount,
            correctPercentage: Math.round(correctPercentage),
            minimumRequired: 80
          }
        }
      }

      // Lấy tất cả questionBankIds từ logs
      const questionBankIds = [...new Set(logs.map((l: any) => l.questionBankId))]

      // Query QuestionBanks với answers từ database
      const questionBanks = await this.prisma.questionBank.findMany({
        where: {
          id: { in: questionBankIds }
        },
        include: {
          answers: true
        }
      })

      // Tạo map để truy cập nhanh
      const questionBankMap = new Map(questionBanks.map((qb) => [qb.id, qb]))
      const selectedByQuestion = new Map<number, number>(
        logs.map((l) => [Number(l.questionBankId), Number(l.answerId)])
      )

      const translateOrFallback = async (key?: string, jp?: string): Promise<string> => {
        if (key) {
          const t =
            (await this.translationHelper.getTranslation(key, normalizedLang)) ||
            (await this.translationHelper.getTranslation(key, 'vi'))
          if (t) return t
        }
        return jp || ''
      }

      // Group questions theo questionType (VOCABULARY, GRAMMAR, KANJI)
      const questionsByType: Record<string, any[]> = {
        VOCABULARY: [],
        GRAMMAR: [],
        KANJI: []
      }

      // Map questions với translations và answers
      const mappedQuestions = await Promise.all(
        logs.map(async (log: any) => {
          const qb = questionBankMap.get(log.questionBankId)
          if (!qb) return null

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

          // Build full answer list; mark correct and user-selected incorrect
          const reviewAnswers: any[] = []
          const toShortLabel = (text: string): string => {
            if (!text) return ''
            const match = text.match(/"([^"]+)"/)
            if (match && match[1]) return match[1].trim()
            return text.trim()
          }
          for (const a of answers) {
            let answerLabel = pickLabelFromComposite(a?.answerJp || '', normalizedLang)
            // Loại bỏ prefix "jp:" nếu có
            if (answerLabel.startsWith('jp:')) {
              answerLabel = answerLabel.replace(/^jp:\s*/, '')
            }
            const label = toShortLabel(answerLabel)
            const explanation = await translateOrFallback(
              a?.answerKey || undefined,
              a?.answerJp || undefined
            )
            let entry: any = { id: a.id, answer: label }
            if (correct && a.id === correct.id) {
              entry.type = 'correct_answer'
              entry.explantion = explanation
            } else if (
              userSelectedId &&
              a.id === userSelectedId &&
              (!correct || userSelectedId !== correct.id)
            ) {
              entry.type = 'user_selected_incorrect'
              entry.explantion = explanation
            }
            reviewAnswers.push(entry)
          }

          return {
            questionBank: qb,
            question,
            isCorrect,
            reviewAnswers,
            turnNumber: log.turnNumber || null
          }
        })
      )

      // Filter null và group theo questionType
      const validQuestions = mappedQuestions.filter((q) => q !== null)
      for (const q of validQuestions) {
        const questionType = q.questionBank.questionType
        if (questionType && questionsByType[questionType]) {
          questionsByType[questionType].push(q)
        }
      }

      // Tạo testSets theo type (VOCABULARY, GRAMMAR, KANJI)
      const allTestSets: any[] = []
      let answeredCorrect = 0
      let answeredInCorrect = 0

      const targetTypes = ['VOCABULARY', 'GRAMMAR', 'KANJI']
      for (const type of targetTypes) {
        const questions = questionsByType[type]
        if (questions.length === 0) continue

        // Sort theo turnNumber nếu có, nếu không thì theo thứ tự trong logs
        questions.sort((a, b) => {
          if (a.turnNumber !== null && b.turnNumber !== null) {
            return a.turnNumber - b.turnNumber
          }
          return 0
        })

        const testSetData: any = {
          id: null, // Không có testSet ID vì lấy từ logs
          name:
            type === 'VOCABULARY' ? 'Từ vựng' : type === 'GRAMMAR' ? 'Ngữ pháp' : 'Kanji',
          testType: type,
          testSetQuestionBanks: questions.map((q, index) => {
            if (q.isCorrect) answeredCorrect++
            else answeredInCorrect++

            return {
              id: null, // Không có testSetQuestionBank ID
              questionOrder: index + 1,
              questionBank: {
                id: q.questionBank.id,
                question: q.question,
                isCorrect: q.isCorrect,
                answers: q.reviewAnswers
              }
            }
          })
        }

        allTestSets.push(testSetData)
      }

      const testRes = await this.testService.findOne(attempt.testId, normalizedLang)

      // Tính score: (số câu đúng / tổng số câu) * 100, max 100 điểm
      const score = calculateScore(answeredCorrect, totalQuestions)

      const data = {
        id: attempt.testId,
        name: testRes.data.name,
        description: testRes.data.description,
        testType: testRes.data.testType,
        testSets: allTestSets,
        totalQuestions,
        answeredCorrect,
        answeredInCorrect,
        score,
        time: Number((attempt as any)?.time ?? 0),
        status: (attempt as any)?.status
      }

      return {
        statusCode: 200,
        message: this.i18nService.translate(
          UserTestAttemptMessage.REVIEW_SUCCESS,
          normalizedLang
        ),
        data
      }
    } catch (error) {
      this.logger.error('Error building lesson test attempt review:', error)
      if (error instanceof HttpException) {
        throw error
      }
      throw error
    }
  }

  async submitPlacementTestCompletion(
    userTestAttemptId: number,
    userId: number,
    timeSeconds?: number
  ) {
    try {
      this.logger.log(
        `Submitting placement test completion for attempt: ${userTestAttemptId}`
      )

      // 1. Lấy thông tin UserTestAttempt
      const attempt = await this.userTestAttemptRepository.findById(userTestAttemptId)
      if (!attempt) {
        throw UserTestAttemptNotFoundException
      }

      // 2. Kiểm tra xem attempt có thuộc về user này không
      if (attempt.userId !== userId) {
        throw UnauthorizedUserTestAttemptAccessException
      }

      // 3. Lấy thông tin Test để lấy các TestSets
      const test = await this.testService.findOne(attempt.testId, 'vi')
      if (!test || !test.data) {
        throw TestNotFoundException
      }

      // 4. Lấy các TestSets của Test
      const testTestSets = await this.userTestAttemptRepository.findTestTestSetsByTestId(
        attempt.testId
      )

      if (testTestSets.length === 0) {
        throw new HttpException('Test này chưa có TestSet nào', 400)
      }

      const testSetIds = testTestSets.map((tts: any) => tts.testSetId)

      // 5. Lấy tất cả Question từ các TestSets
      const allQuestions =
        await this.userTestAttemptRepository.findTestSetQuestionBanksByTestSetIds(
          testSetIds
        )

      // Chỉ lấy các loại VOCABULARY, GRAMMAR, KANJI
      const filteredQuestions = allQuestions.filter((tsqb) =>
        ['VOCABULARY', 'GRAMMAR', 'KANJI'].includes(tsqb.questionBank.questionType)
      )

      this.logger.log(
        `Found ${filteredQuestions.length} questions for test ${attempt.testId}`
      )

      // 6. Lấy tất cả UserTestAnswerLog của attempt này
      const answerLogsResult =
        await this.userTestAnswerLogService.findByUserTestAttemptId(userTestAttemptId)
      let userAnswers = answerLogsResult.data.results
      this.logger.log(
        `Found ${userAnswers.length} user answers for attempt ${userTestAttemptId}`
      )

      // Chỉ lấy 10 câu đầu tiên từ logs (những câu đã làm)
      if (userAnswers.length > 10) {
        userAnswers = userAnswers.slice(0, 10)
        this.logger.log(
          `PLACEMENT_TEST_DONE: Limiting to first 10 questions from ${answerLogsResult.data.results.length} total logs`
        )
      }

      // 7. Tạo map để lấy câu trả lời nhanh (chỉ từ 10 câu đầu)
      const answerMap = new Map<number, boolean>()
      userAnswers.forEach((log: any) => {
        answerMap.set(log.questionBankId, log.isCorrect)
      })

      // 8. Lọc filteredQuestions chỉ lấy những câu có trong 10 câu đã làm
      const answeredQuestionBankIds = new Set(
        userAnswers.map((log: any) => log.questionBankId)
      )
      const answeredQuestions = filteredQuestions.filter((tsqb: any) =>
        answeredQuestionBankIds.has(tsqb.questionBank.id)
      )

      // 9. Nhóm questions theo levelN và tính tỷ lệ đúng (chỉ từ 10 câu đã làm)
      const questionsByLevel: Record<number, { total: number; correct: number }> = {
        1: { total: 0, correct: 0 },
        2: { total: 0, correct: 0 },
        3: { total: 0, correct: 0 },
        4: { total: 0, correct: 0 },
        5: { total: 0, correct: 0 }
      }

      answeredQuestions.forEach((tsqb: any) => {
        const levelN = tsqb.questionBank.levelN || 5 // Mặc định N5 nếu không có levelN
        if (levelN >= 1 && levelN <= 5) {
          questionsByLevel[levelN].total++
          const isCorrect = answerMap.get(tsqb.questionBank.id) || false
          if (isCorrect) {
            questionsByLevel[levelN].correct++
          }
        }
      })

      this.logger.log('Questions by level (from answered questions):', questionsByLevel)

      // 10. Đánh giá levelN với ngưỡng linh hoạt cho từng level
      // Định nghĩa ngưỡng ở một chỗ
      const THRESHOLDS = {
        5: 2 / 3, // ~66.7% (N5)
        4: 3 / 4, // 75%   (N4)
        3: 2 / 3 // ~66.7% (N3)
      }
      // N5 = 5 (dễ nhất), N4 = 4, N3 = 3
      // Logic: Duyệt tuần tự từ N5 → N4 → N3 với ngưỡng cụ thể cho từng level
      let evaluatedLevelN = 5 // Mặc định N5 (thấp nhất)

      // Bước 1: Kiểm tra N5
      const n5Stats = questionsByLevel[5]
      if (n5Stats.total > 0) {
        const requiredCorrect = Math.ceil(n5Stats.total * THRESHOLDS[5])
        if (n5Stats.correct >= requiredCorrect) {
          // Đỗ N5
          evaluatedLevelN = 4 // Cập nhật trình độ tạm thời
          const percentage = ((n5Stats.correct / n5Stats.total) * 100).toFixed(1)
          this.logger.log(
            `User passed N5: ${n5Stats.correct}/${n5Stats.total} correct (${percentage}% >= ${(THRESHOLDS[5] * 100).toFixed(1)}%), moving to N4`
          )
        } else {
          // Trượt N5
          evaluatedLevelN = 5
          const percentage = ((n5Stats.correct / n5Stats.total) * 100).toFixed(1)
          this.logger.log(
            `User failed N5: ${n5Stats.correct}/${n5Stats.total} correct (${percentage}% < ${(THRESHOLDS[5] * 100).toFixed(1)}%), final level: N5`
          )
        }
      } else {
        this.logger.warn(`No N5 questions found, keeping level at N5`)
      }

      // Bước 2: Kiểm tra N4
      if (evaluatedLevelN === 4) {
        const n4Stats = questionsByLevel[4]
        if (n4Stats.total > 0) {
          const requiredCorrect = Math.ceil(n4Stats.total * THRESHOLDS[4])
          if (n4Stats.correct >= requiredCorrect) {
            // Đỗ N4
            evaluatedLevelN = 3 // Cập nhật trình độ tạm thời
            const percentage = ((n4Stats.correct / n4Stats.total) * 100).toFixed(1)
            this.logger.log(
              `User passed N4: ${n4Stats.correct}/${n4Stats.total} correct (${percentage}% >= ${(THRESHOLDS[4] * 100).toFixed(1)}%), moving to N3`
            )
          } else {
            // Trượt N4
            evaluatedLevelN = 4
            const percentage = ((n4Stats.correct / n4Stats.total) * 100).toFixed(1)
            this.logger.log(
              `User failed N4: ${n4Stats.correct}/${n4Stats.total} correct (${percentage}% < ${(THRESHOLDS[4] * 100).toFixed(1)}%), final level: N4`
            )
          }
        } else {
          this.logger.warn(`No N4 questions found, keeping level at N4`)
        }
      }

      // Bước 3: Kiểm tra N3
      if (evaluatedLevelN === 3) {
        const n3Stats = questionsByLevel[3]
        if (n3Stats.total > 0) {
          const requiredCorrect = Math.ceil(n3Stats.total * THRESHOLDS[3])
          if (n3Stats.correct >= requiredCorrect) {
            // Đỗ N3
            evaluatedLevelN = 2 // Sẵn sàng học N2
            const percentage = ((n3Stats.correct / n3Stats.total) * 100).toFixed(1)
            this.logger.log(
              `User passed N3: ${n3Stats.correct}/${n3Stats.total} correct (${percentage}% >= ${(THRESHOLDS[3] * 100).toFixed(1)}%), final level: N2`
            )
          } else {
            // Trượt N3
            evaluatedLevelN = 3
            const percentage = ((n3Stats.correct / n3Stats.total) * 100).toFixed(1)
            this.logger.log(
              `User failed N3: ${n3Stats.correct}/${n3Stats.total} correct (${percentage}% < ${(THRESHOLDS[3] * 100).toFixed(1)}%), final level: N3`
            )
          }
        } else {
          this.logger.warn(`No N3 questions found, keeping level at N3`)
        }
      }

      this.logger.log(`Final evaluated levelN: N${evaluatedLevelN}`)

      // 11. Tìm Level trong DB với levelNumber = evaluatedLevelN và levelType = USER
      const level = null
      if (!level) {
        this.logger.warn(
          `Level N${evaluatedLevelN} not found in database, keeping current user level`
        )
      }
      // else {
      //     // 12. Cập nhật levelId của User
      //     // await this.userRepo.update({
      //     //     id: userId,
      //     //     updatedById: userId,
      //     //     data: { levelId: level.id }
      //     // })
      //     // this.logger.log(`Updated user ${userId} levelId to ${level.id} (N${evaluatedLevelN})`)
      // }

      // 13. Update status và time của UserTestAttempt
      await this.userTestAttemptRepository.update(
        { id: userTestAttemptId },
        {
          status: 'COMPLETED',
          ...(timeSeconds !== undefined ? { time: timeSeconds } : {})
        }
      )
      this.logger.log(`Updated attempt ${userTestAttemptId} to COMPLETED`)

      // 14. Tính tổng số câu đúng và tổng số câu hỏi (chỉ từ 10 câu đã làm)
      const totalQuestions = userAnswers.length // Số câu đã làm (tối đa 10)
      let totalCorrect = 0
      userAnswers.forEach((log: any) => {
        if (log.isCorrect) {
          totalCorrect++
        }
      })
      const percentage =
        totalQuestions > 0
          ? parseFloat(((totalCorrect / totalQuestions) * 100).toFixed(1))
          : 0

      this.logger.log(
        `PLACEMENT_TEST_DONE: Total questions answered: ${totalQuestions}, Correct: ${totalCorrect}, Percentage: ${percentage}%`
      )

      // 15. Trả về kết quả với levelN được đánh giá
      return {
        statusCode: 200,
        message: 'Đánh giá trình độ hoàn thành',
        data: {
          levelN: evaluatedLevelN,
          levelId: level,
          totalCorrect,
          totalQuestions,
          percentage
        }
      }
    } catch (error) {
      this.logger.error('Error submitting placement test completion:', error)
      if (error instanceof HttpException) {
        throw error
      }
      throw error
    }
  }

  /**
   * Trao phần thưởng từ lesson khi hoàn thành test cuối
   * Lấy rewardId từ lesson dựa vào testId
   */
  private async grantTestRewards(
    testId: number,
    userId: number,
    lessonId?: number | null
  ) {
    try {
      // 1. Tìm lesson có testId = testId của attempt
      const lesson = await this.prisma.lesson.findFirst({
        where: { testId: testId },
        select: { id: true, rewardId: true }
      })

      if (!lesson) {
        this.logger.warn(`No lesson found with testId ${testId}, skipping reward grant`)
        return null
      }

      // 2. Kiểm tra xem đã hoàn thành lesson này trước đó chưa
      const userProgress = await this.userProgressRepository.findByUserAndLesson(
        userId,
        lesson.id
      )
      const hasCompletedBefore = userProgress?.status === ProgressStatus.COMPLETED

      // 3. Lấy rewardId từ lesson
      const rewardIds = lesson.rewardId ?? []
      if (rewardIds.length === 0) {
        this.logger.log(`Lesson ${lesson.id} has no rewards, skipping reward grant`)
        return null
      }

      // 4. Trao phần thưởng với sourceType LESSON
      // Nếu đã hoàn thành trước đó thì chỉ nhận 10% (reduceReward = true)
      const rewardResults = await this.rewardService.convertRewardsWithUser(
        rewardIds,
        userId,
        UserRewardSourceType.LESSON,
        {
          reduceReward: hasCompletedBefore
        },
        lessonId
      )

      this.logger.log(
        `Granted lesson rewards for user ${userId}, lesson ${lesson.id}, reduceReward: ${hasCompletedBefore}`
      )
      return rewardResults
    } catch (error) {
      this.logger.error(
        `Error granting test rewards for user ${userId}, testId ${testId}:`,
        error
      )
      // Không throw error để không ảnh hưởng đến flow chính
      return null
    }
  }

  /**
   * Cập nhật UserProgress khi hoàn thành LESSON_REVIEW test (COMPLETED)
   * Tìm lesson có testId = testId của attempt, sau đó update UserProgress với testId, status COMPLETED
   */
  private async updateUserProgressOnLessonReviewCompletion(
    userId: number,
    testId: number
  ) {
    try {
      this.logger.log(
        `Updating UserProgress for user ${userId} after completing LESSON_REVIEW test ${testId}`
      )

      // Tìm lesson có testId = testId của attempt
      const lesson = await this.prisma.lesson.findFirst({
        where: { testId: testId },
        select: { id: true }
      })

      if (!lesson) {
        this.logger.warn(
          `No lesson found with testId ${testId}, skipping UserProgress update`
        )
        return
      }

      // Tìm UserProgress của user và lesson đó
      const userProgress = await this.userProgressRepository.findByUserAndLesson(
        userId,
        lesson.id
      )

      if (!userProgress) {
        this.logger.warn(
          `UserProgress not found for user ${userId}, lesson ${lesson.id}, skipping update`
        )
        return
      }

      // Không update status nếu đã là COMPLETED
      if (userProgress.status === ProgressStatus.COMPLETED) {
        this.logger.log(
          `UserProgress for user ${userId}, lesson ${lesson.id} is already COMPLETED, skipping status update`
        )
        // Chỉ update testId nếu chưa có
        if (!userProgress.testId) {
          await this.userProgressRepository.update(
            { id: userProgress.id },
            { testId: testId }
          )
          this.logger.log(
            `Updated testId for user ${userId}, lesson ${lesson.id} to ${testId}`
          )
        }
        return
      }

      // Update UserProgress với testId, status COMPLETED và progressPercentage 100%
      // Vì đã hoàn thành LESSON_REVIEW test nên coi như đã hoàn thành lesson
      await this.userProgressRepository.update(
        { id: userProgress.id },
        {
          testId: testId,
          status: ProgressStatus.COMPLETED
        }
      )
      this.logger.log(
        `Updated UserProgress for user ${userId}, lesson ${lesson.id} with testId ${testId}, status COMPLETED`
      )

      // Cập nhật UserProgress cho lesson tiếp theo
      const nextLessonId = await this.userProgressRepository.getNextLessonId(lesson.id)
      if (nextLessonId) {
        // Kiểm tra status hiện tại của lesson tiếp theo
        const nextLessonProgress = await this.userProgressRepository.findByUserAndLesson(
          userId,
          nextLessonId
        )

        // Chỉ update nếu status là NOT_STARTED
        if (
          !nextLessonProgress ||
          nextLessonProgress.status === ProgressStatus.NOT_STARTED
        ) {
          // Sử dụng upsert để tự động tạo hoặc update UserProgress cho lesson tiếp theo
          // Upsert sẽ tự động lấy testId từ lesson nếu chưa có
          await this.userProgressRepository.upsert(userId, nextLessonId, {
            status: ProgressStatus.IN_PROGRESS,
            progressPercentage: 0
          })
          this.logger.log(
            `Updated/Created UserProgress for user ${userId}, lesson ${nextLessonId} with status IN_PROGRESS`
          )
        } else {
          this.logger.log(
            `Skipping update for user ${userId}, lesson ${nextLessonId} - current status is ${nextLessonProgress.status}, not NOT_STARTED`
          )
        }
      } else {
        this.logger.log(
          `No next lesson found for user ${userId} after completing lesson ${lesson.id}`
        )
      }

      this.logger.log(`Completed lesson ${lesson.id} for user ${userId}`)
    } catch (error) {
      this.logger.error('Error updating UserProgress on lesson review completion:', error)
      // Không throw error để không ảnh hưởng đến flow chính
    }
  }

  /**
   * Cập nhật UserProgress thành status TESTING_LAST_FAILED khi thất bại LESSON_REVIEW test (FAILED)
   * Tìm lesson có testId = testId của attempt, sau đó update UserProgress với testId, status TESTING_LAST_FAILED
   */
  private async updateUserProgressOnLessonReviewFailure(userId: number, testId: number) {
    try {
      this.logger.log(
        `Updating UserProgress for user ${userId} after failing LESSON_REVIEW test ${testId}`
      )

      // Tìm lesson có testId = testId của attempt
      const lesson = await this.prisma.lesson.findFirst({
        where: { testId: testId },
        select: { id: true }
      })

      if (!lesson) {
        this.logger.warn(
          `No lesson found with testId ${testId}, skipping UserProgress update`
        )
        return
      }

      // Tìm UserProgress của user và lesson đó
      const userProgress = await this.userProgressRepository.findByUserAndLesson(
        userId,
        lesson.id
      )

      if (!userProgress) {
        this.logger.warn(
          `UserProgress not found for user ${userId}, lesson ${lesson.id}, skipping update`
        )
        return
      }

      // Không update status nếu đã là COMPLETED
      if (userProgress.status === ProgressStatus.COMPLETED) {
        this.logger.log(
          `UserProgress for user ${userId}, lesson ${lesson.id} is already COMPLETED, skipping status update`
        )
        return
      }

      // Update UserProgress với testId, status TESTING_LAST_FAILED
      // User cần làm lại LESSON_REVIEW test
      await this.userProgressRepository.update(
        { id: userProgress.id },
        {
          testId: testId,
          status: ProgressStatus.TESTING_LAST_FAILED
        }
      )
      this.logger.log(
        `Updated UserProgress for user ${userId}, lesson ${lesson.id} with testId ${testId}, status TESTING_LAST_FAILED`
      )
    } catch (error) {
      this.logger.error('Error updating UserProgress on lesson review failure:', error)
      // Không throw error để không ảnh hưởng đến flow chính
    }
  }
}
