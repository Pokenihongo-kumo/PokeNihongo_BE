import { UserTestAttemptMessage as M } from '@/i18n/message-keys'
import { HttpException, HttpStatus } from '@nestjs/common'
import { PlacementEvaluationService } from './placement-evaluation.service'
import { TestAttemptGradingService } from './test-attempt-grading.service'
import { TestAttemptReviewService } from './test-attempt-review.service'
import { UserTestAttemptService } from './user-test-attempt.service'

// Only the dependencies touched by the paths under test are faked.
function createService() {
  const repo = {
    findById: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    hasCompletedAttempt: jest.fn()
  }
  const userTestAnswerLogService = { findByUserTestAttemptId: jest.fn() }
  const testService = { findWithTestSetsAndQuestions: jest.fn() }
  // the façade forwards checking/submitting, reviews and placement (phase 6 X3)
  const grading = new TestAttemptGradingService(
    repo as any,
    userTestAnswerLogService as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any
  )
  const review = new TestAttemptReviewService(
    repo as any,
    userTestAnswerLogService as any,
    testService as any,
    {} as any
  )
  const placement = new PlacementEvaluationService(
    repo as any,
    userTestAnswerLogService as any,
    {} as any,
    {} as any
  )
  const service = new UserTestAttemptService(
    repo as any,
    {} as any,
    userTestAnswerLogService as any,
    testService as any,
    {} as any,
    grading,
    review,
    placement
  )
  return { service, repo, userTestAnswerLogService, testService }
}

async function expectHttpError(promise: Promise<unknown>, status: HttpStatus) {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e
  )
  expect(error).toBeInstanceOf(HttpException)
  expect((error as HttpException).getStatus()).toBe(status)
  return (error as HttpException).getResponse()
}

const completedAttempt = { id: 1, userId: 7, status: 'COMPLETED', testId: 3 }
const oneCorrectOfFive = {
  results: [
    { questionBankId: 1, answerId: 2, isCorrect: true },
    { questionBankId: 2, answerId: 3, isCorrect: false },
    { questionBankId: 3, answerId: 4, isCorrect: false },
    { questionBankId: 4, answerId: 5, isCorrect: false },
    { questionBankId: 5, answerId: 6, isCorrect: false }
  ]
}

describe('UserTestAttemptService', () => {
  describe('abandon', () => {
    it('throws 400 (not a 2xx body) when the attempt is not IN_PROGRESS', async () => {
      const { service, repo } = createService()
      repo.findById.mockResolvedValue({ id: 1, userId: 7, status: 'COMPLETED' })

      const body = await expectHttpError(service.abandon(1, 7), HttpStatus.BAD_REQUEST)

      expect(body).toMatchObject({
        errorKey: M.NOT_IN_PROGRESS
      })
      expect(repo.update).not.toHaveBeenCalled()
    })
  })

  describe("another user's attempt is a 403", () => {
    it('check-completion (was not checked)', async () => {
      const { service, repo } = createService()
      repo.findById.mockResolvedValue({
        id: 1,
        userId: 8,
        status: 'IN_PROGRESS',
        testId: 3
      })

      const body = await expectHttpError(
        service.checkTestCompletion(1, 7),
        HttpStatus.FORBIDDEN
      )

      expect(body).toMatchObject({ errorKey: M.NOT_OWNED })
    })

    it('delete (was not checked), and nothing is deleted', async () => {
      const { service, repo } = createService()
      const del = jest.fn()
      Object.assign(repo, { delete: del })
      repo.findById.mockResolvedValue({
        id: 1,
        userId: 8,
        status: 'ABANDONED',
        testId: 3
      })

      await expectHttpError(service.remove(1, 7), HttpStatus.FORBIDDEN)

      expect(del).not.toHaveBeenCalled()
    })
  })

  describe('getTestAttemptReview', () => {
    it('throws 403 with the translated key when the score is below 80% and nothing was completed', async () => {
      const { service, repo, userTestAnswerLogService, testService } = createService()
      repo.findUnique.mockResolvedValue(completedAttempt)
      testService.findWithTestSetsAndQuestions.mockResolvedValue({
        testType: 'MATCH_TEST',
        testTestSets: [{ testSet: { testSetQuestionBanks: [{}, {}, {}, {}, {}] } }]
      })
      userTestAnswerLogService.findByUserTestAttemptId.mockResolvedValue(oneCorrectOfFive)
      repo.hasCompletedAttempt.mockResolvedValue(false)

      const body = await expectHttpError(
        service.getTestAttemptReview(1, 7, 'vi'),
        HttpStatus.FORBIDDEN
      )

      expect(body).toMatchObject({
        errorKey: M.REVIEW_INSUFFICIENT_SCORE
      })
    })
  })

  describe('getLessonTestAttemptReview', () => {
    it('throws 403 with the translated key when the score is below 80% and nothing was completed', async () => {
      const { service, repo, userTestAnswerLogService } = createService()
      repo.findUnique.mockResolvedValue(completedAttempt)
      userTestAnswerLogService.findByUserTestAttemptId.mockResolvedValue(oneCorrectOfFive)
      repo.hasCompletedAttempt.mockResolvedValue(false)

      const body = await expectHttpError(
        service.getLessonTestAttemptReview(1, 7, 'vi'),
        HttpStatus.FORBIDDEN
      )

      expect(body).toMatchObject({
        errorKey: M.REVIEW_INSUFFICIENT_SCORE
      })
    })
  })
})
