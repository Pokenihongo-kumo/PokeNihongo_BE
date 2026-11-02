import { UserExerciseAttemptMessage } from '@/i18n/message-keys'
import { HttpException, HttpStatus } from '@nestjs/common'
import { UserExerciseAttemptService } from './user-exercise-attempt.service'

// Only the dependencies touched by the paths under test are faked.
function createService() {
  const repo = {
    findById: jest.fn(),
    update: jest.fn(),
    hasCompletedAttempt: jest.fn()
  }
  const userAnswerLogService = { findByUserExerciseAttemptId: jest.fn() }
  const exercisesService = { getExercisesByIdHaveQuestionBanks: jest.fn() }
  const i18nService = { translate: jest.fn((key: string) => key) }
  const service = new UserExerciseAttemptService(
    repo as any,
    {} as any,
    userAnswerLogService as any,
    {} as any,
    exercisesService as any,
    {} as any,
    {} as any,
    {} as any,
    i18nService as any,
    {} as any
  )
  return { service, repo, userAnswerLogService, exercisesService }
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

describe('UserExerciseAttemptService', () => {
  describe('abandon', () => {
    it('throws 400 (not a 2xx body) when the attempt is not IN_PROGRESS', async () => {
      const { service, repo } = createService()
      repo.findById.mockResolvedValue({ id: 1, userId: 7, status: 'COMPLETED' })

      const body = await expectHttpError(service.abandon(1, 7), HttpStatus.BAD_REQUEST)

      expect(body).toMatchObject({
        message: 'Chỉ có thể bỏ dở bài tập đang trong trạng thái IN_PROGRESS'
      })
      expect(repo.update).not.toHaveBeenCalled()
    })
  })

  describe('getExerciseAttemptReview', () => {
    it('throws 403 with the translated key when the score is below 80% and nothing was completed', async () => {
      const { service, repo, userAnswerLogService, exercisesService } = createService()
      jest.spyOn(service, 'findOne').mockResolvedValue({
        data: { id: 1, userId: 7, status: 'COMPLETED', exerciseId: 3 }
      } as any)
      exercisesService.getExercisesByIdHaveQuestionBanks.mockResolvedValue({
        data: { testSet: { testSetQuestionBanks: [{}, {}, {}, {}, {}] } }
      })
      userAnswerLogService.findByUserExerciseAttemptId.mockResolvedValue({
        data: { results: [{ questionBankId: 1, answerId: 2, isCorrect: true }] }
      })
      repo.hasCompletedAttempt.mockResolvedValue(false)

      const body = await expectHttpError(
        service.getExerciseAttemptReview(1, 7, 'vi'),
        HttpStatus.FORBIDDEN
      )

      expect(body).toMatchObject({
        errorKey: UserExerciseAttemptMessage.REVIEW_INSUFFICIENT_SCORE
      })
    })
  })
})
