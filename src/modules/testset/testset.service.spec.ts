import { HttpStatus } from '@nestjs/common'
import { TestSetService } from './testset.service'
import { UpsertTestSetWithQuestionBanksBodySchema } from './entities/testset.entity'

describe('TestSetService', () => {
  const repo = {
    findById: jest.fn(),
    questionTypesOf: jest.fn(),
    updateWithMeanings: jest.fn(),
    linksOf: jest.fn(),
    questionBanksByIds: jest.fn(),
    saveWithQuestions: jest.fn(),
    delete: jest.fn()
  }
  const questionBanks = { createWithMeanings: jest.fn() }
  const service = new TestSetService(
    repo as never,
    questionBanks as never,
    { generateAudioFromText: jest.fn() } as never,
    {
      translate: (k: string, _l: string, args?: object) =>
        args ? `${k} ${JSON.stringify(args)}` : k
    } as never
  )

  beforeEach(() => {
    jest.resetAllMocks()
    repo.findById.mockResolvedValue({ id: 5, testType: 'VOCABULARY', levelN: 3 })
    repo.questionTypesOf.mockResolvedValue(['VOCABULARY'])
    repo.updateWithMeanings.mockResolvedValue({ id: 5 })
    repo.linksOf.mockResolvedValue(new Map([[70, 7]]))
    repo.questionBanksByIds.mockImplementation(
      async (ids: number[]) =>
        new Map(
          ids
            .filter((id) => id === 7)
            .map((id) => [id, { id, questionKey: null, questionType: 'VOCABULARY' }])
        )
    )
    repo.saveWithQuestions.mockResolvedValue({ id: 5 })
  })

  it('a missing test set is a 404 (the class itself was thrown: 500/400)', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(service.deleteTestSet(5)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'testset.NOT_FOUND' }
    })
    expect(repo.delete).not.toHaveBeenCalled()
  })

  it('level and type of a test set with questions change only as the rules allow', async () => {
    await expect(
      service.updateTestSetWithMeanings(5, { levelN: 2 })
    ).rejects.toMatchObject({
      response: { errorKey: 'testset.CANNOT_CHANGE_LEVEL_HAS_QUESTIONS' }
    })
    await expect(
      service.updateTestSetWithMeanings(5, { testType: 'GRAMMAR' })
    ).rejects.toMatchObject({
      response: {
        errorKey: 'testset.CANNOT_CHANGE_TYPE_SPECIFIC',
        errorArgs: { from: 'VOCABULARY', to: 'GRAMMAR' }
      }
    })
    // To 0 (several levels) and to GENERAL are allowed
    await service.updateTestSetWithMeanings(5, { levelN: 0, testType: 'GENERAL' })

    repo.findById.mockResolvedValue({ id: 5, testType: 'GENERAL', levelN: 3 })
    await expect(
      service.updateTestSetWithMeanings(5, { testType: 'GRAMMAR' })
    ).rejects.toMatchObject({
      response: {
        errorKey: 'testset.CANNOT_CHANGE_TYPE_GENERAL_SINGLE',
        errorArgs: { questionType: 'VOCABULARY' }
      }
    })
    repo.questionTypesOf.mockResolvedValue(['VOCABULARY', 'KANJI'])
    await expect(
      service.updateTestSetWithMeanings(5, { testType: 'VOCABULARY' })
    ).rejects.toMatchObject({
      response: { errorKey: 'testset.CANNOT_CHANGE_TYPE_GENERAL_MULTIPLE' }
    })
    expect(repo.updateWithMeanings).toHaveBeenCalledTimes(1)
  })

  it('upsert: a missing QuestionBank is a 404 before any new question is created', async () => {
    await expect(
      service.upsertTestSetWithQuestionBanks(
        {
          id: 5,
          questionBanks: [
            { questionJp: '新しい', questionType: 'VOCABULARY' },
            { id: 99, questionJp: 'ない', questionType: 'VOCABULARY' }
          ]
        },
        1
      )
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'testset.QUESTION_BANK_NOT_FOUND', errorArgs: { id: 99 } }
    })
    expect(questionBanks.createWithMeanings).not.toHaveBeenCalled()
  })

  it('upsert: a link id resolves to its QuestionBank, new questions are created, order kept', async () => {
    questionBanks.createWithMeanings.mockResolvedValue({ data: { id: 8 } })
    await service.upsertTestSetWithQuestionBanks(
      {
        id: 5,
        questionBanks: [
          { questionJp: '新しい', questionType: 'VOCABULARY', audioUrl: ' ' },
          { id: 70, questionJp: '古い', questionType: 'VOCABULARY' }
        ]
      },
      1
    )
    expect(questionBanks.createWithMeanings.mock.calls[0][0]).toMatchObject({
      audioUrl: null
    })
    const { questions } = repo.saveWithQuestions.mock.calls[0][0]
    expect(questions.map((q: { questionBankId: number }) => q.questionBankId)).toEqual([
      8, 7
    ])
    expect(questions[1]).toMatchObject({
      edit: { questionJp: '古い' },
      questionKey: 'question.VOCABULARY.7'
    })
  })
})

describe('UpsertTestSetWithQuestionBanksBodySchema', () => {
  const messages = (body: object) => {
    const result = UpsertTestSetWithQuestionBanksBodySchema.safeParse(body)
    return result.success ? [] : result.error.issues.map((i) => i.message)
  }

  it('a new test set needs testType, meanings and questions (were 400s in the service)', () => {
    expect(messages({})).toEqual([
      'testset.TEST_TYPE_REQUIRED',
      'testset.MEANINGS_REQUIRED',
      'testset.QUESTION_BANKS_REQUIRED'
    ])
    expect(messages({ id: 5 })).toEqual([])
  })

  it('rejects non-Japanese questionJp, repeated ids and a bad level', () => {
    expect(
      messages({
        id: 5,
        levelN: 9,
        questionBanks: [
          { id: 1, questionJp: 'hello', questionType: 'VOCABULARY' },
          { id: 1, questionJp: 'こんにちは', questionType: 'VOCABULARY' }
        ]
      })
    ).toEqual([
      'testset.INVALID_LEVEL',
      'testset.QUESTION_JP_NOT_JAPANESE',
      'testset.DUPLICATE_QUESTION_IDS'
    ])
  })
})
