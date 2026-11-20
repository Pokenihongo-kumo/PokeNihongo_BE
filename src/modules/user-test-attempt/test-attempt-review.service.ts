import { calculateScore } from '@/common/utils/algorithm'
import { pickLabelFromComposite } from '@/common/utils/prase.utils'
import { TestService } from '@/modules/test/test.service'
import { TranslationHelperService } from '@/modules/translation/translation.helper.service'
import { UserTestAnswerLogService } from '@/modules/user-test-answer-log/user-test-answer-log.service'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import {
  AttemptNotOwnedException,
  ReviewInsufficientScoreException,
  TestAttemptHasNoAnswersException,
  TestHasNoTestSetException,
  UserTestAttemptNotFoundException
} from './dto/user-test-attempt.error'
import { UserTestAttemptRepo } from './user-test-attempt.repo'

// The review of a finished attempt: each question with the user's answer,
// the right one and the explanations in the request language. Shown only
// for COMPLETED/FAILED attempts with enough score.
@Injectable()
export class TestAttemptReviewService {
  private readonly logger = new Logger(TestAttemptReviewService.name)

  constructor(
    private readonly userTestAttemptRepository: UserTestAttemptRepo,
    private readonly userTestAnswerLogService: UserTestAnswerLogService,
    private readonly testService: TestService,
    private readonly translationHelper: TranslationHelperService
  ) {}

  async getTestAttemptReview(id: number, userId: number, languageCode: string) {
    try {
      const attemptRes = await this.findAttempt(id)
      const attempt = attemptRes as any

      // Kiểm tra attempt có thuộc về user này không
      if ((attempt as any)?.userId !== userId) {
        throw new AttemptNotOwnedException()
      }

      const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'

      // Only build review when attempt is COMPLETED or FAILED
      if (attempt.status !== 'COMPLETED' && attempt.status !== 'FAILED') {
        return {
          completed: false,
          data: { status: attempt.status }
        }
      }

      // Lấy thông tin Test với các TestSets
      const test = await this.testService.findWithTestSetsAndQuestions(attempt.testId)

      if (!test || !test.testTestSets || test.testTestSets.length === 0) {
        throw new TestHasNoTestSetException()
      }

      // Xác định test type từ attempt (nếu có) hoặc từ test object đã query
      // attempt.test có thể có nếu findOne include test, nếu không thì dùng test.testType
      const testType =
        attempt.test && attempt.test.testType ? attempt.test.testType : test.testType

      // Load user answer logs for this attempt
      const logsRes = await this.userTestAnswerLogService.findByUserTestAttemptId(id)
      let logs: Array<{ questionBankId: number; answerId: number; isCorrect: boolean }> =
        (logsRes?.results || []) as any

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
              const entry: any = { id: a.id, answer: label }
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
        name: testRes.name,
        description: testRes.description,
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
        completed: true,
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

  async getLessonTestAttemptReview(id: number, userId: number, languageCode: string) {
    try {
      const attemptRes = await this.findAttempt(id)
      const attempt = attemptRes as any

      // Kiểm tra attempt có thuộc về user này không
      if ((attempt as any)?.userId !== userId) {
        throw new AttemptNotOwnedException()
      }

      const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'

      // Only build review when attempt is COMPLETED or FAILED
      if (attempt.status !== 'COMPLETED' && attempt.status !== 'FAILED') {
        return {
          completed: false,
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
      }> = (logsRes?.results || []) as any

      if (!logs || logs.length === 0) {
        throw new TestAttemptHasNoAnswersException()
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
        throw new ReviewInsufficientScoreException()
      }

      // Lấy tất cả questionBankIds từ logs
      const questionBankIds = [...new Set(logs.map((l: any) => l.questionBankId))]

      // Query QuestionBanks với answers từ database
      const questionBanks =
        await this.userTestAttemptRepository.findQuestionsWithAnswers(questionBankIds)

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
            const entry: any = { id: a.id, answer: label }
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
        name: testRes.name,
        description: testRes.description,
        testType: testRes.testType,
        testSets: allTestSets,
        totalQuestions,
        answeredCorrect,
        answeredInCorrect,
        score,
        time: Number((attempt as any)?.time ?? 0),
        status: (attempt as any)?.status
      }

      return {
        completed: true,
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

  // The attempt or 404 (UserTestAttemptService.findOne)
  private async findAttempt(id: number) {
    const attempt = await this.userTestAttemptRepository.findUnique({ id })
    if (!attempt) throw new UserTestAttemptNotFoundException()
    return attempt
  }
}
