import { pickLabelFromComposite } from '@/common/utils/prase.utils'
import { TestService } from '@/modules/test/test.service'
import { TranslationHelperService } from '@/modules/translation/translation.helper.service'
import { UserTestAnswerLogService } from '@/modules/user-test-answer-log/user-test-answer-log.service'
import { UserTestService } from '@/modules/user-test/user-test.service'
import { toPaginationMeta } from '@/shared/utils/pagination'
import { isNotFoundPrismaError } from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import {
  AttemptNotOwnedException,
  InvalidUserTestAttemptDataException,
  TestAttemptNotInProgressException,
  TestHasNoTestSetException,
  TestNotFoundException,
  TestOutOfLimitException,
  UserTestAttemptNotFoundException,
  UserTestNotFoundException
} from './dto/user-test-attempt.error'
import {
  GetUserTestAttemptListQuery,
  UpdateUserTestAttemptBody
} from './dto/user-test-attempt.zod-dto'
import { PlacementEvaluationService } from './placement-evaluation.service'
import { TestAttemptGradingService } from './test-attempt-grading.service'
import { TestAttemptReviewService } from './test-attempt-review.service'
import { UserTestAttemptRepo } from './user-test-attempt.repo'

export type { TestCompletionOutcome } from './test-attempt-grading.service'

@Injectable()
export class UserTestAttemptService {
  private readonly logger = new Logger(UserTestAttemptService.name)

  constructor(
    private readonly userTestAttemptRepository: UserTestAttemptRepo,
    private readonly userTestService: UserTestService,
    private readonly userTestAnswerLogService: UserTestAnswerLogService,
    private readonly testService: TestService,
    private readonly translationHelper: TranslationHelperService,
    private readonly grading: TestAttemptGradingService,
    private readonly review: TestAttemptReviewService,
    private readonly placement: PlacementEvaluationService
  ) {}

  async create(userId: number, testId: number) {
    try {
      // 1. Lấy thông tin Test
      const testRes = await this.testService.findOne(testId, 'vi')
      if (!testRes) {
        throw new TestNotFoundException()
      }

      const userTestAttempt = await this.userTestAttemptRepository.create({
        userId: userId,
        testId: testId
      })

      return userTestAttempt
    } catch (error) {
      throw this.toAttemptError(error)
    }
  }

  async findAll(query: GetUserTestAttemptListQuery) {
    const { currentPage, pageSize, userId, testId, status } = query

    const result = await this.userTestAttemptRepository.findMany({
      currentPage,
      pageSize,
      userId,
      testId,
      status
    })

    return {
      results: result.items,
      pagination: toPaginationMeta(currentPage, pageSize, result.total)
    }
  }

  async findOne(id: number) {
    const userTestAttempt = await this.userTestAttemptRepository.findUnique({
      id: id
    })

    if (!userTestAttempt) {
      throw new UserTestAttemptNotFoundException()
    }

    return userTestAttempt
  }

  async update(id: number, body: UpdateUserTestAttemptBody) {
    try {
      const userTestAttempt = await this.userTestAttemptRepository.update({ id }, body)
      return userTestAttempt
    } catch (error) {
      throw this.toAttemptError(error)
    }
  }

  // The app deletes its own attempt
  async remove(id: number, userId: number) {
    try {
      await this.ownAttempt(id, userId)
      const userTestAttempt = await this.userTestAttemptRepository.delete({ id })
      return userTestAttempt
    } catch (error) {
      throw this.toAttemptError(error)
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
        throw new UserTestAttemptNotFoundException()
      }

      // 2. Kiểm tra xem attempt có thuộc về user này không
      if (attempt.userId !== userId) {
        throw new AttemptNotOwnedException()
      }

      // 3. Kiểm tra xem attempt có đang IN_PROGRESS không
      if (attempt.status !== 'IN_PROGRESS') {
        throw new TestAttemptNotInProgressException()
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

      return updatedAttempt
    } catch (error) {
      this.logger.error('Error abandoning test attempt:', error)
      throw error
    }
  }

  async getStatus(userTestAttemptId: number, userId: number) {
    try {
      this.logger.log(
        `Getting status for user test attempt: ${userTestAttemptId} for user: ${userId}`
      )

      // 1. Lấy thông tin UserTestAttempt
      const attempt = await this.userTestAttemptRepository.findById(userTestAttemptId)
      if (!attempt) {
        throw new UserTestAttemptNotFoundException()
      }

      // 2. Kiểm tra xem attempt có thuộc về user này không
      if (attempt.userId !== userId) {
        throw new AttemptNotOwnedException()
      }

      return attempt
    } catch (error) {
      this.logger.error('Error getting test attempt status:', error)
      throw error
    }
  }

  async getTestAttemptByTestId(testId: number, userId: number, languageCode: string) {
    try {
      const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'

      // Kiểm tra và giảm limit của UserTest
      const userTest = await this.userTestService.findByUserAndTest(userId, testId)
      if (!userTest) {
        throw new UserTestNotFoundException()
      }

      // Kiểm tra limit (null, undefined, hoặc 0 được coi như không giới hạn)
      // Chỉ throw error khi limit < 0 (âm số) hoặc limit > 0 nhưng đã hết lượt (cần check riêng)
      // Logic này phải nhất quán với decrementLimit: limit = 0 được coi là "không giới hạn"
      if (userTest.limit !== null && userTest.limit !== undefined && userTest.limit < 0) {
        throw new TestOutOfLimitException()
      }

      // Tìm attempt IN_PROGRESS gần nhất của user với test này
      const inProgressAttempt = await this.userTestAttemptRepository.findLatestInProgress(
        userId,
        testId
      )

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
          await this.userTestAttemptRepository.markAbandoned(inProgressAttempt.id)

          // Giảm limit và tạo attempt mới
          await this.userTestService.decrementLimit(userId, testId)
          const createAttempt = await this.create(userId, testId)
          attempt = createAttempt as any
          userTestAttemptId = attempt.id
        } else {
          // Dưới 1 tiếng → reuse và update updatedAt
          this.logger.log(
            `Found existing IN_PROGRESS attempt (ID: ${inProgressAttempt.id}) for user ${userId} and test ${testId}, reusing it (age: ${Math.round(timeDiffMs / (60 * 1000))} minutes)`
          )

          // Update updatedAt để reset timer
          await this.userTestAttemptRepository.touch(inProgressAttempt.id, now)

          attempt = await this.userTestAttemptRepository.findById(inProgressAttempt.id)
          if (!attempt) {
            throw new UserTestAttemptNotFoundException()
          }
          userTestAttemptId = attempt.id
        }
      } else {
        // Nếu không có IN_PROGRESS (có thể là ABANDONED, COMPLETED, FAILED hoặc chưa có) → tạo mới
        this.logger.log(
          `No IN_PROGRESS attempt found for user ${userId} and test ${testId}, creating new attempt`
        )

        // Giảm limit trước khi cho phép làm bài (chỉ khi tạo mới)
        await this.userTestService.decrementLimit(userId, testId)

        const createAttempt = await this.create(userId, testId)
        attempt = createAttempt as any
        userTestAttemptId = attempt.id
      }

      // Lấy thông tin Test với các TestSets
      const testRes = await this.testService.findOne(testId, languageCode)
      const test = await this.testService.findWithTestSetsAndQuestions(testId)

      if (!test || !test.testTestSets || test.testTestSets.length === 0) {
        throw new TestHasNoTestSetException()
      }

      // Load user answer logs (nếu reuse attempt IN_PROGRESS thì có thể đã có logs)
      let answeredCount = 0
      let userAnswerLogs: any[] = []
      const answerLogsResult =
        await this.userTestAnswerLogService.findByUserTestAttemptId(userTestAttemptId)
      if (answerLogsResult?.results) {
        userAnswerLogs = answerLogsResult.results
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

      return {
        id: test.id,
        name: testRes.name,
        description: testRes.description,
        testType: test.testType,
        testSets: allTestSets,
        userTestAttemptId,
        totalQuestions,
        answeredQuestions: answeredCount,
        time: Number(attempt?.time ?? 0)
      }
    } catch (error) {
      this.logger.error('Error getting test attempt by test id:', error)
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
  // ---- moved out (phase 6 X3); the controller still calls these ----

  checkTestCompletion(
    ...args: Parameters<TestAttemptGradingService['checkTestCompletion']>
  ) {
    return this.grading.checkTestCompletion(...args)
  }

  submitTestCompletion(
    ...args: Parameters<TestAttemptGradingService['submitTestCompletion']>
  ) {
    return this.grading.submitTestCompletion(...args)
  }

  getTestAttemptReview(
    ...args: Parameters<TestAttemptReviewService['getTestAttemptReview']>
  ) {
    return this.review.getTestAttemptReview(...args)
  }

  getLessonTestAttemptReview(
    ...args: Parameters<TestAttemptReviewService['getLessonTestAttemptReview']>
  ) {
    return this.review.getLessonTestAttemptReview(...args)
  }

  submitPlacementTestCompletion(
    ...args: Parameters<PlacementEvaluationService['submitPlacementTestCompletion']>
  ) {
    return this.placement.submitPlacementTestCompletion(...args)
  }

  //#region helpers
  // The attempt, when it is the user's
  private async ownAttempt(id: number, userId: number) {
    const attempt = await this.userTestAttemptRepository.findById(id)
    if (!attempt) throw new UserTestAttemptNotFoundException()
    if (attempt.userId !== userId) throw new AttemptNotOwnedException()
    return attempt
  }

  private toAttemptError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'Test attempt request failed',
      error instanceof Error ? error.stack : error
    )
    if (isNotFoundPrismaError(error)) return new UserTestAttemptNotFoundException()
    return new InvalidUserTestAttemptDataException()
  }
  //#endregion
}
