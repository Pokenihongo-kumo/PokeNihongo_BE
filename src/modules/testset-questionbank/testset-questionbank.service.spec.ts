import { HttpStatus } from '@nestjs/common'
import { TestSetQuestionBankService } from './testset-questionbank.service'

describe('TestSetQuestionBankService', () => {
  const repo = {
    findTestSet: jest.fn(),
    findQuestionBank: jest.fn(),
    findByTestSetAndQuestionBank: jest.fn(),
    maxQuestionOrder: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn()
  }
  const service = new TestSetQuestionBankService(
    repo as never,
    {} as never,
    {} as never,
    {
      translate: (k: string, _l: string, args?: Record<string, unknown>) =>
        args ? `${k} ${JSON.stringify(args)}` : k
    } as never
  )

  const questions: Record<number, object> = {
    1: { id: 1, questionType: 'VOCABULARY', levelN: 3 },
    2: { id: 2, questionType: 'GRAMMAR', levelN: 3 },
    3: { id: 3, questionType: 'VOCABULARY', levelN: 2 }
  }

  beforeEach(() => {
    jest.resetAllMocks()
    repo.findTestSet.mockResolvedValue({ id: 9, testType: 'VOCABULARY', levelN: 3 })
    repo.findQuestionBank.mockImplementation(async (id: number) => questions[id] ?? null)
    repo.findByTestSetAndQuestionBank.mockResolvedValue(null)
    repo.maxQuestionOrder.mockResolvedValue(5)
    repo.create.mockImplementation(async (data) => ({ id: 70, ...data }))
  })

  it('appends after the highest order, not after the count (orders can have gaps)', async () => {
    const res = await service.create({ testSetId: 9, questionBankId: 1 })
    expect(repo.create).toHaveBeenCalledWith({
      testSetId: 9,
      questionBankId: 1,
      questionOrder: 6
    })
    expect(res.message).toBe('testset_questionbank.CREATE_SUCCESS')
  })

  it('type and level rules: own type only, same level; GENERAL takes lower levels', async () => {
    await expect(
      service.create({ testSetId: 9, questionBankId: 2 })
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { errorKey: 'testset_questionbank.TYPE_INCOMPATIBLE' }
    })
    await expect(
      service.create({ testSetId: 9, questionBankId: 3 })
    ).rejects.toMatchObject({
      response: {
        errorKey: 'testset_questionbank.LEVEL_MISMATCH',
        errorArgs: { testSetLevel: 3, questionLevel: 2 }
      }
    })

    repo.findTestSet.mockResolvedValue({ id: 9, testType: 'GENERAL', levelN: 3 })
    await expect(
      service.create({ testSetId: 9, questionBankId: 2 })
    ).resolves.toBeDefined()
    repo.findTestSet.mockResolvedValue({ id: 9, testType: 'GENERAL', levelN: 2 })
    await expect(
      service.create({ testSetId: 9, questionBankId: 1 })
    ).rejects.toMatchObject({
      response: { errorKey: 'testset_questionbank.LEVEL_ABOVE_TEST_SET' }
    })
  })

  it('a test set without a level takes any level (create used to refuse it)', async () => {
    repo.findTestSet.mockResolvedValue({ id: 9, testType: 'VOCABULARY', levelN: null })
    await expect(
      service.create({ testSetId: 9, questionBankId: 3 })
    ).resolves.toBeDefined()
  })

  it('missing test set or question is a 404 with its own key', async () => {
    await expect(
      service.create({ testSetId: 9, questionBankId: 99 })
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'testset_questionbank.QUESTION_BANK_NOT_FOUND' }
    })
    repo.findTestSet.mockResolvedValue(null)
    await expect(
      service.create({ testSetId: 9, questionBankId: 1 })
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'testset_questionbank.TEST_SET_NOT_FOUND' }
    })
  })

  it('createMultiple: 207 with translated reasons (a missing question was "unknown error")', async () => {
    repo.findByTestSetAndQuestionBank.mockImplementation(async (_t, qb: number) =>
      qb === 1 ? null : { id: 1 }
    )
    const res = await service.createMultiple({
      testSetId: 9,
      questionBankIds: [1, 99, 3]
    })

    expect(res.statusCode).toBe(207)
    expect(res.message).toBe(
      'testset_questionbank.MULTIPLE_PARTIAL {"created":1,"total":3,"failed":2}'
    )
    expect(res.data.failed).toEqual([
      { questionBankId: 99, reason: 'testset_questionbank.QUESTION_BANK_NOT_FOUND' },
      {
        questionBankId: 3,
        reason: 'testset_questionbank.LEVEL_MISMATCH {"testSetLevel":3,"questionLevel":2}'
      }
    ])
  })

  it('update to another question checks the same rules', async () => {
    repo.findById.mockResolvedValue({ id: 70, testSetId: 9, questionBankId: 1 })
    await expect(service.update(70, { questionBankId: 2 })).rejects.toMatchObject({
      response: { errorKey: 'testset_questionbank.TYPE_INCOMPATIBLE' }
    })
    expect(repo.update).not.toHaveBeenCalled()
  })
})
