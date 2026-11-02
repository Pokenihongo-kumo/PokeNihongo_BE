import { UserTestAttemptMessage } from '@/i18n/message-keys'
import { HttpException, HttpStatus } from '@nestjs/common'
import { UserTestAttemptService } from './user-test-attempt.service'

// Only the dependencies touched by the paths under test are faked.
function createService() {
  const repo = {
    findById: jest.fn(),
    update: jest.fn(),
    hasCompletedAttempt: jest.fn()
  }
  const userTestAnswerLogService = { findByUserTestAttemptId: jest.fn() }
  const testRepo = { findByIdWithTestSetsAndQuestions: jest.fn() }
  const i18nService = { translate: jest.fn((key: string) => key) }
  const service = new UserTestAttemptService(
    repo as any,
    {} as any,
    {} as any,
    userTestAnswerLogService as any,
    {} as any,
    testRepo as any,
    {} as any,
    {} as any,
    {} as any,
    i18nService as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any
  )
  return { service, repo, userTestAnswerLogService, testRepo }
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

const completedAttempt = { data: { id: 1, userId: 7, status: 'COMPLETED', testId: 3 } }
const oneCorrectOfFive = {
  data: {
    results: [
      { questionBankId: 1, answerId: 2, isCorrect: true },
      { questionBankId: 2, answerId: 3, isCorrect: false },
      { questionBankId: 3, answerId: 4, isCorrect: false },
      { questionBankId: 4, answerId: 5, isCorrect: false },
      { questionBankId: 5, answerId: 6, isCorrect: false }
    ]
  }
}

describe('UserTestAttemptService', () => {
  describe('abandon', () => {
    it('throws 400 (not a 2xx body) when the attempt is not IN_PROGRESS', async () => {
      const { service, repo } = createService()
      repo.findById.mockResolvedValue({ id: 1, userId: 7, status: 'COMPLETED' })

      const body = await expectHttpError(service.abandon(1, 7), HttpStatus.BAD_REQUEST)

      expect(body).toMatchObject({
        message: 'Chỉ có thể bỏ dở bài test đang trong trạng thái IN_PROGRESS'
      })
      expect(repo.update).not.toHaveBeenCalled()
    })
  })

  describe('getTestAttemptReview', () => {
    it('throws 403 with the translated key when the score is below 80% and nothing was completed', async () => {
      const { service, repo, userTestAnswerLogService, testRepo } = createService()
      jest.spyOn(service, 'findOne').mockResolvedValue(completedAttempt as any)
      testRepo.findByIdWithTestSetsAndQuestions.mockResolvedValue({
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
        errorKey: UserTestAttemptMessage.REVIEW_INSUFFICIENT_SCORE
      })
    })
  })

  describe('getLessonTestAttemptReview', () => {
    it('throws 403 with the translated key when the score is below 80% and nothing was completed', async () => {
      const { service, repo, userTestAnswerLogService } = createService()
      jest.spyOn(service, 'findOne').mockResolvedValue(completedAttempt as any)
      userTestAnswerLogService.findByUserTestAttemptId.mockResolvedValue(oneCorrectOfFive)
      repo.hasCompletedAttempt.mockResolvedValue(false)

      const body = await expectHttpError(
        service.getLessonTestAttemptReview(1, 7, 'vi'),
        HttpStatus.FORBIDDEN
      )

      expect(body).toMatchObject({
        errorKey: UserTestAttemptMessage.REVIEW_INSUFFICIENT_SCORE
      })
    })
  })
})
