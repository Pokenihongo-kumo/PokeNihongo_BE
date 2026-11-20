import { TestService } from '@/modules/test/test.service'
import { UserTestAnswerLogService } from '@/modules/user-test-answer-log/user-test-answer-log.service'
import { UserService } from '@/modules/user/user.service'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import {
  AttemptNotOwnedException,
  TestHasNoTestSetException,
  TestNotFoundException,
  UserTestAttemptNotFoundException
} from './dto/user-test-attempt.error'
import { UserTestAttemptRepo } from './user-test-attempt.repo'

// Submitting the placement test: grading, the JLPT level it gives and the
// user's level update.
@Injectable()
export class PlacementEvaluationService {
  private readonly logger = new Logger(PlacementEvaluationService.name)

  constructor(
    private readonly userTestAttemptRepository: UserTestAttemptRepo,
    private readonly userTestAnswerLogService: UserTestAnswerLogService,
    private readonly testService: TestService,
    private readonly userService: UserService
  ) {}

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
        throw new UserTestAttemptNotFoundException()
      }

      // 2. Kiểm tra xem attempt có thuộc về user này không
      if (attempt.userId !== userId) {
        throw new AttemptNotOwnedException()
      }

      // 3. Lấy thông tin Test để lấy các TestSets
      const test = await this.testService.findOne(attempt.testId, 'vi')
      if (!test) {
        throw new TestNotFoundException()
      }

      // 4. Lấy các TestSets của Test
      const testTestSets = await this.userTestAttemptRepository.findTestTestSetsByTestId(
        attempt.testId
      )

      if (testTestSets.length === 0) {
        throw new TestHasNoTestSetException()
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
      let userAnswers = answerLogsResult.results
      this.logger.log(
        `Found ${userAnswers.length} user answers for attempt ${userTestAttemptId}`
      )

      // Chỉ lấy 10 câu đầu tiên từ logs (những câu đã làm)
      if (userAnswers.length > 10) {
        userAnswers = userAnswers.slice(0, 10)
        this.logger.log(
          `PLACEMENT_TEST_DONE: Limiting to first 10 questions from ${answerLogsResult.results.length} total logs`
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
      //     // await this.userService.updateUserRow({
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
        levelN: evaluatedLevelN,
        levelId: level,
        totalCorrect,
        totalQuestions,
        percentage
      }
    } catch (error) {
      this.logger.error('Error submitting placement test completion:', error)
      if (error instanceof HttpException) {
        throw error
      }
      throw error
    }
  }
}
