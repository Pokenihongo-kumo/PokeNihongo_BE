import { HttpStatus } from '@nestjs/common'
import { UserTestAnswerLogService } from './user-test-answer-log.service'

describe('UserTestAnswerLogService.upsert', () => {
  const repo = {
    findAttempt: jest.fn(),
    isQuestionInTestSets: jest.fn(),
    findAnswer: jest.fn(),
    upsert: jest.fn()
  }
  const service = new UserTestAnswerLogService(
    repo as never,
    {
      translate: (k: string) => k
    } as never
  )
  const body = { userTestAttemptId: 4, questionBankId: 9, answerId: 21 }

  beforeEach(() => {
    jest.resetAllMocks()
    repo.findAttempt.mockResolvedValue({ userId: 7, testSetIds: [3] })
    repo.isQuestionInTestSets.mockResolvedValue(true)
    repo.findAnswer.mockResolvedValue({ isCorrect: true, questionBankId: 9 })
    repo.upsert.mockImplementation(async (data, isCorrect) => ({
      id: 1,
      ...data,
      isCorrect
    }))
  })

  it('saves the answer with its correctness', async () => {
    const res = await service.upsert(body, 7)
    expect(repo.upsert).toHaveBeenCalledWith(body, true)
    expect(res.data.isCorrect).toBe(true)
  })

  it('a missing attempt is a 404 (was a 400 "invalid data"); another user\'s a 403', async () => {
    repo.findAttempt.mockResolvedValueOnce(null)
    await expect(service.upsert(body, 7)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'user_test_answer_log.ATTEMPT_NOT_FOUND' }
    })
    await expect(service.upsert(body, 8)).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
      response: { errorKey: 'user_test_answer_log.ATTEMPT_NOT_OWNED' }
    })
  })

  it("the question must be in the test and the answer one of the question's", async () => {
    repo.isQuestionInTestSets.mockResolvedValueOnce(false)
    await expect(service.upsert(body, 7)).rejects.toMatchObject({
      response: { errorKey: 'user_test_answer_log.QUESTION_NOT_IN_TEST' }
    })
    repo.findAnswer.mockResolvedValueOnce({ isCorrect: false, questionBankId: 10 })
    await expect(service.upsert(body, 7)).rejects.toMatchObject({
      response: { errorKey: 'user_test_answer_log.ANSWER_NOT_IN_QUESTION' }
    })
    repo.findAnswer.mockResolvedValueOnce(null)
    await expect(service.upsert(body, 7)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'user_test_answer_log.ANSWER_NOT_FOUND' }
    })
    expect(repo.upsert).not.toHaveBeenCalled()
  })
})
