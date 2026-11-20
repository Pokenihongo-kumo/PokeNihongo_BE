import { LessonService } from '@/modules/lesson/lesson.service'
import { TestService } from '@/modules/test/test.service'
import { TestSetQuestionBankService } from '@/modules/testset-questionbank/testset-questionbank.service'
import { UserProgressService } from '@/modules/user-progress/user-progress.service'
import { UserTestAnswerLogService } from '@/modules/user-test-answer-log/user-test-answer-log.service'
import { Injectable, Logger } from '@nestjs/common'
import { ProgressStatus, UserRewardSourceType } from '@prisma/client'
import { RewardService } from '../reward/reward.service'
import {
  AttemptNotOwnedException,
  TestHasNoTestSetException,
  TestNotFoundException,
  UserTestAttemptNotFoundException
} from './dto/user-test-attempt.error'
import { REQUIRED_ANSWERS_FOR_LESSON_REVIEW } from './dto/variable'
import { UserTestAttemptRepo } from './user-test-attempt.repo'

export type TestCompletionOutcome =
  | 'not-enough-answers'
  | 'no-answer'
  | 'incomplete'
  | 'all-correct'
  | 'some-wrong'
  | 'review-passed'
  | 'review-failed'

// Checking and submitting a test attempt: grading (LESSON_REVIEW needs
// ${REQUIRED_ANSWERS_FOR_LESSON_REVIEW} answers, other tests every question), the attempt's status and
// score, the lesson-review progress and the test rewards. The controller
// picks the message from the outcome.
@Injectable()
export class TestAttemptGradingService {
  private readonly logger = new Logger(TestAttemptGradingService.name)

  constructor(
    private readonly userTestAttemptRepository: UserTestAttemptRepo,
    private readonly userTestAnswerLogService: UserTestAnswerLogService,
    private readonly testService: TestService,
    private readonly testSetQuestionBankService: TestSetQuestionBankService,
    private readonly userProgressService: UserProgressService,
    private readonly rewardService: RewardService,
    private readonly lessonService: LessonService
  ) {}

  async checkTestCompletion(userTestAttemptId: number, userId: number) {
    try {
      const attempt = await this.ownAttempt(userTestAttemptId, userId)

      // 2. Lấy thông tin Test để biết các TestSets
      const testRes = await this.testService.findOne(attempt.testId, 'vi')
      if (!testRes) {
        throw new TestNotFoundException()
      }

      // Lấy testType từ testRes
      const testType = (testRes as any).testType

      // 3. Lấy tất cả TestSets của Test
      const test = await this.userTestAttemptRepository.findTestWithTestSetIds(
        attempt.testId
      )

      if (!test || !test.testTestSets || test.testTestSets.length === 0) {
        throw new TestHasNoTestSetException()
      }

      const testSetIds = test.testTestSets.map((tts) => tts.testSet.id)

      // 4. Lấy tất cả QuestionBanks từ tất cả TestSets
      const allQuestionBanks: any[] = []
      for (const testSetId of testSetIds) {
        const questionsResult = await this.testSetQuestionBankService.findFullByTestSetId(
          testSetId,
          'vi'
        )
        if (questionsResult && Array.isArray(questionsResult)) {
          allQuestionBanks.push(...questionsResult)
        }
      }

      this.logger.log(
        `Found ${allQuestionBanks.length} questions for test ${attempt.testId}`
      )

      // 5. Lấy tất cả UserTestAnswerLog của attempt này
      const answerLogsResult =
        await this.userTestAnswerLogService.findByUserTestAttemptId(userTestAttemptId)
      const userAnswers = answerLogsResult.results
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
          const outcome = 'not-enough-answers' as const
          return {
            outcome,
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
          const outcome = 'not-enough-answers' as const
          return {
            outcome,
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
      const outcome = allCorrect ? ('all-correct' as const) : ('some-wrong' as const)

      // Với LESSON_REVIEW, totalQuestions luôn là 10
      const totalQuestions = isLessonReview
        ? REQUIRED_ANSWERS_FOR_LESSON_REVIEW
        : allQuestionBanks.length

      return {
        outcome,
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
        throw new UserTestAttemptNotFoundException()
      }

      // 2. Kiểm tra xem attempt có thuộc về user này không
      if (attempt.userId !== userId) {
        throw new AttemptNotOwnedException()
      }

      // 3. Lấy thông tin Test để biết testType
      const testRes = await this.testService.findOne(attempt.testId, 'vi')
      if (!testRes) {
        throw new TestNotFoundException()
      }

      const testType = (testRes as any).testType

      // 5. Lấy tất cả UserTestAnswerLog của attempt này
      const answerLogsResult =
        await this.userTestAnswerLogService.findByUserTestAttemptId(userTestAttemptId)
      const userAnswers = answerLogsResult.results

      // Xử lý riêng cho LESSON_REVIEW test
      if (testType === 'LESSON_REVIEW') {
        // Với LESSON_REVIEW: mặc định 10 câu là đủ, không cần kiểm tra unansweredQuestions
        const expectedQuestionCount = 10

        // Nếu không có câu trả lời nào mà vẫn nộp bài, coi như FAILED
        if (userAnswers.length === 0) {
          const newStatus = 'FAILED'
          const outcome = 'no-answer' as const

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
            outcome,
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
        let outcome: TestCompletionOutcome

        if (score >= 80) {
          newStatus = 'COMPLETED'
          outcome = 'review-passed' as const
        } else {
          newStatus = 'FAILED'
          outcome = 'review-failed' as const
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
          const lessonId = await this.lessonService.findByTestId(attempt.testId)
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
          outcome,
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
      const test = await this.userTestAttemptRepository.findTestWithTestSetIds(
        attempt.testId
      )

      if (!test || !test.testTestSets || test.testTestSets.length === 0) {
        throw new TestHasNoTestSetException()
      }

      const testSetIds = test.testTestSets.map((tts) => tts.testSet.id)

      // 4. Lấy tất cả QuestionBanks từ tất cả TestSets
      const allQuestionBanks: any[] = []
      for (const testSetId of testSetIds) {
        const questionsResult = await this.testSetQuestionBankService.findFullByTestSetId(
          testSetId,
          'vi'
        )
        if (questionsResult && Array.isArray(questionsResult)) {
          allQuestionBanks.push(...questionsResult)
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
        const outcome = 'no-answer' as const

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
          outcome,
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
        const outcome = 'incomplete' as const

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
          outcome,
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
      let outcome: TestCompletionOutcome

      if (allCorrect) {
        newStatus = 'COMPLETED'
        outcome = 'all-correct' as const
      } else {
        newStatus = 'FAILED'
        outcome = 'some-wrong' as const
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
        outcome,
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

  private async grantTestRewards(
    testId: number,
    userId: number,
    lessonId?: number | null
  ) {
    try {
      // 1. Tìm lesson có testId = testId của attempt
      const lesson = await this.userTestAttemptRepository.findLessonRewardForTest(testId)

      if (!lesson) {
        this.logger.warn(`No lesson found with testId ${testId}, skipping reward grant`)
        return null
      }

      // 2. Kiểm tra xem đã hoàn thành lesson này trước đó chưa
      const userProgress = await this.userProgressService.getByUserAndLesson(
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
      const lesson = await this.userTestAttemptRepository.findLessonIdForTest(testId)

      if (!lesson) {
        this.logger.warn(
          `No lesson found with testId ${testId}, skipping UserProgress update`
        )
        return
      }

      // Tìm UserProgress của user và lesson đó
      const userProgress = await this.userProgressService.getByUserAndLesson(
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
          await this.userProgressService.updateProgressRow(
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
      await this.userProgressService.updateProgressRow(
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
      const nextLessonId = await this.userProgressService.getNextLessonId(lesson.id)
      if (nextLessonId) {
        // Kiểm tra status hiện tại của lesson tiếp theo
        const nextLessonProgress = await this.userProgressService.getByUserAndLesson(
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
          await this.userProgressService.upsert(userId, nextLessonId, {
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
      const lesson = await this.userTestAttemptRepository.findLessonIdForTest(testId)

      if (!lesson) {
        this.logger.warn(
          `No lesson found with testId ${testId}, skipping UserProgress update`
        )
        return
      }

      // Tìm UserProgress của user và lesson đó
      const userProgress = await this.userProgressService.getByUserAndLesson(
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
      await this.userProgressService.updateProgressRow(
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

  /**
   * Trao phần thưởng từ lesson khi hoàn thành test cuối
   * Lấy rewardId từ lesson dựa vào testId
   */
  //#region helpers
  // The attempt, when it is the user's
  private async ownAttempt(id: number, userId: number) {
    const attempt = await this.userTestAttemptRepository.findById(id)
    if (!attempt) throw new UserTestAttemptNotFoundException()
    if (attempt.userId !== userId) throw new AttemptNotOwnedException()
    return attempt
  }
}
