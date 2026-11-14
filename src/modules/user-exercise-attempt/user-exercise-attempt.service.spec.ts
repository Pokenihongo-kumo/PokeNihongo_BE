import { UserExerciseAttemptMessage as M } from '@/i18n/message-keys'
import { HttpException, HttpStatus } from '@nestjs/common'
import { UserExerciseAttemptService } from './user-exercise-attempt.service'

// Only the dependencies touched by the paths under test are faked.
function createService() {
  const repo = {
    findById: jest.fn(),
    update: jest.fn(),
    hasCompletedAttempt: jest.fn()
  }
  const questionBankService = { findByTestSetId: jest.fn() }
  const userAnswerLogService = { findByUserExerciseAttemptId: jest.fn() }
  const userProgressService = { updateProgressByLesson: jest.fn() }
  const exercisesService = {
    findById: jest.fn(),
    findByLessonId: jest.fn(),
    getExercisesByIdHaveQuestionBanks: jest.fn()
  }
  const i18nService = { translate: jest.fn((key: string) => key) }
  const rewardService = { convertRewardsWithUser: jest.fn() }
  const service = new UserExerciseAttemptService(
    repo as any,
    questionBankService as any,
    userAnswerLogService as any,
    userProgressService as any,
    exercisesService as any,
    {} as any,
    {} as any,
    {} as any,
    i18nService as any,
    rewardService as any
  )
  return {
    service,
    repo,
    questionBankService,
    userAnswerLogService,
    exercisesService,
    rewardService
  }
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

      expect(body).toMatchObject({ errorKey: M.NOT_IN_PROGRESS })
      expect(repo.update).not.toHaveBeenCalled()
    })

    it("another user's attempt is a 403 (was a 500 from new Error)", async () => {
      const { service, repo } = createService()
      repo.findById.mockResolvedValue({ id: 1, userId: 8, status: 'IN_PROGRESS' })

      const body = await expectHttpError(service.abandon(1, 7), HttpStatus.FORBIDDEN)

      expect(body).toMatchObject({ errorKey: M.NOT_OWNED })
    })
  })

  describe('submitExerciseCompletion', () => {
    const setUp = (logs: Array<{ questionBankId: number; isCorrect: boolean }>) => {
      const deps = createService()
      deps.repo.findById.mockResolvedValue({
        id: 1,
        userId: 7,
        exerciseId: 3,
        status: 'IN_PROGRESS'
      })
      deps.exercisesService.findById.mockResolvedValue({
        id: 3,
        lessonId: 5,
        testSetId: 9,
        rewardId: [2]
      })
      deps.exercisesService.findByLessonId.mockResolvedValue([{ id: 3 }])
      deps.questionBankService.findByTestSetId.mockResolvedValue({
        data: { results: [{ id: 11 }, { id: 12 }] }
      })
      deps.userAnswerLogService.findByUserExerciseAttemptId.mockResolvedValue({
        data: { results: logs }
      })
      return deps
    }

    it('every answer right: COMPLETED, rewards reduced when completed before', async () => {
      const { service, repo, rewardService } = setUp([
        { questionBankId: 11, isCorrect: true },
        { questionBankId: 12, isCorrect: true }
      ])
      repo.hasCompletedAttempt.mockResolvedValue(true)

      const res = await service.submitExerciseCompletion(1, 7, 30)

      expect(repo.update).toHaveBeenCalledWith(
        { id: 1 },
        { status: 'COMPLETED', time: 30 }
      )
      expect(rewardService.convertRewardsWithUser).toHaveBeenCalledWith(
        [2],
        7,
        'EXERCISE',
        { reduceReward: true },
        3
      )
      expect(res).toMatchObject({
        message: M.ALL_CORRECT,
        data: { status: 'COMPLETED', score: 100, allCorrect: true }
      })
    })

    it('a question left: FAILED with the unanswered ids, no rewards', async () => {
      const { service, repo, rewardService } = setUp([
        { questionBankId: 11, isCorrect: true }
      ])

      const res = await service.submitExerciseCompletion(1, 7)

      expect(repo.update).toHaveBeenCalledWith({ id: 1 }, { status: 'FAILED' })
      expect(rewardService.convertRewardsWithUser).not.toHaveBeenCalled()
      expect(res).toMatchObject({
        message: M.SUBMITTED_INCOMPLETE,
        data: { status: 'FAILED', score: 50, unansweredQuestionIds: [12], rewards: null }
      })
    })

    it('nothing answered: FAILED with every question unanswered', async () => {
      const { service } = setUp([])

      const res = await service.submitExerciseCompletion(1, 7)

      expect(res).toMatchObject({
        message: M.SUBMITTED_NO_ANSWER,
        data: { answeredQuestions: 0, unansweredQuestionIds: [11, 12] }
      })
    })

    it("another user's attempt is a 403 and nothing is saved", async () => {
      const { service, repo } = setUp([])

      await expectHttpError(service.submitExerciseCompletion(1, 8), HttpStatus.FORBIDDEN)

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

      expect(body).toMatchObject({ errorKey: M.REVIEW_INSUFFICIENT_SCORE })
    })
  })
})
