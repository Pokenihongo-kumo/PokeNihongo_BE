import { HttpStatus } from '@nestjs/common'
import { QuestionType } from '@prisma/client'
import { AnswerService } from './answer.service'

const answer = (id: number, extra: object = {}) => ({
  id,
  answerJp: `答え${id}`,
  answerKey: 'temp',
  isCorrect: false,
  questionBankId: 7,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...extra
})

describe('AnswerService', () => {
  const repo = {
    checkQuestionExists: jest.fn(),
    getQuestionType: jest.fn(),
    countAnswersByQuestionId: jest.fn(),
    hasCorrectAnswer: jest.fn(),
    checkAnswerExists: jest.fn(),
    create: jest.fn(),
    updateAnswerKey: jest.fn(),
    findById: jest.fn()
  }
  const translations = { create: jest.fn(), findByKey: jest.fn() }
  const languages = { getWithListCode: jest.fn() }
  const service = new AnswerService(
    repo as never,
    translations as never,
    languages as never,
    {
      translate: (k: string, _l: string, args?: Record<string, unknown>) =>
        args ? `${k} ${JSON.stringify(args)}` : k
    } as never
  )

  beforeAll(() => {
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined)
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined)
  })
  beforeEach(() => {
    jest.resetAllMocks()
    repo.checkQuestionExists.mockResolvedValue(true)
    repo.getQuestionType.mockResolvedValue(QuestionType.VOCABULARY)
    repo.countAnswersByQuestionId.mockResolvedValue(0)
    repo.hasCorrectAnswer.mockResolvedValue(false)
    repo.checkAnswerExists.mockResolvedValue(null)
    repo.create.mockImplementation(({ answerJp }) => answer(40, { answerJp }))
    repo.findById.mockImplementation((id: number) =>
      answer(id, { answerKey: `answer.${id}.text` })
    )
    translations.create.mockResolvedValue({})
    translations.findByKey.mockResolvedValue({ translations: [] })
    // Real ids differ from the vi=1/en=2 that used to be hard-coded
    languages.getWithListCode.mockResolvedValue([
      { id: 31, code: 'vi' },
      { id: 32, code: 'en' }
    ])
  })

  it('writes translations with the language ids from the DB (were hard-coded 1/2/3)', async () => {
    await service.createAnswer({
      questionBankId: 7,
      answerJp: '正しい',
      isCorrect: true,
      translations: {
        meaning: [
          { language_code: 'vi', value: 'Đúng' },
          { language_code: 'en', value: 'Right' },
          { language_code: 'ko', value: '?' }
        ]
      }
    })

    expect(translations.create.mock.calls.map(([t]) => t)).toEqual([
      { key: 'answer.40.text', languageId: 31, value: 'Đúng' },
      { key: 'answer.40.text', languageId: 32, value: 'Right' }
    ])
  })

  it('a broken question rule is a 400 with its own key', async () => {
    repo.hasCorrectAnswer.mockResolvedValue(true)
    await expect(
      service.createAnswer({ questionBankId: 7, answerJp: 'x', isCorrect: true })
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { errorKey: 'answer.CORRECT_ANSWER_EXISTS' }
    })

    repo.getQuestionType.mockResolvedValue(QuestionType.MATCHING)
    repo.countAnswersByQuestionId.mockResolvedValue(1)
    await expect(
      service.createAnswer({ questionBankId: 7, answerJp: 'x', isCorrect: true })
    ).rejects.toMatchObject({ response: { errorKey: 'answer.MATCHING_SINGLE_ANSWER' } })
  })

  it('createMultiple reports failures translated and picks 201/207/400', async () => {
    const created = await service.createMultiple({
      questionBankId: 7,
      answers: [{ answerJp: '一', isCorrect: false }]
    })
    expect(created.statusCode).toBe(201)
    expect(created.message).toBe('answer.MULTIPLE_CREATED {"created":1}')

    repo.countAnswersByQuestionId.mockResolvedValueOnce(0).mockResolvedValueOnce(4)
    const partial = await service.createMultiple({
      questionBankId: 7,
      answers: [
        { answerJp: '二', isCorrect: false },
        { answerJp: '三', isCorrect: false }
      ]
    })
    expect(partial.statusCode).toBe(207)
    expect(partial.data.failed).toEqual([
      { answerJp: '三', reason: 'answer.MAX_ANSWERS_REACHED' }
    ])

    repo.findById.mockResolvedValueOnce(null)
    const none = await service.createMultiple({
      questionBankId: 7,
      answers: [{ id: 99, answerJp: '四', isCorrect: false }]
    })
    expect(none.statusCode).toBe(400)
    expect(none.data.failed[0].reason).toBe('answer.ANSWER_ID_NOT_FOUND {"id":99}')
  })
})
