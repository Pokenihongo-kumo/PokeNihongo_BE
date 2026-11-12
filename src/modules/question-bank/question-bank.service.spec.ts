import { HttpStatus } from '@nestjs/common'
import { QuestionBankService } from './question-bank.service'
import { CreateQuestionBankWithAnswersBodySchema } from './entities/question-bank.entity'

describe('QuestionBankService', () => {
  const repo = {
    questionJpTaken: jest.fn(),
    createWithMeanings: jest.fn(),
    findById: jest.fn(),
    updateWithMeanings: jest.fn(),
    deleteMany: jest.fn()
  }
  const speech = { generateAudioFromText: jest.fn() }
  const answers = { createAnswer: jest.fn(), failureReason: jest.fn() }
  const service = new QuestionBankService(
    repo as never,
    speech as never,
    answers as never,
    {
      translate: (k: string, _l: string, args?: object) =>
        args ? `${k} ${JSON.stringify(args)}` : k
    } as never
  )

  beforeEach(() => {
    jest.resetAllMocks()
    repo.questionJpTaken.mockResolvedValue(false)
    repo.createWithMeanings.mockImplementation(async (data) => ({ id: 9, ...data }))
    repo.findById.mockResolvedValue({ id: 9, questionJp: '古い' })
    repo.updateWithMeanings.mockImplementation(async (_id, data) => ({ id: 9, ...data }))
    speech.generateAudioFromText.mockResolvedValue('https://audio/9.mp3')
  })

  it('internal create (testset upsert) still refuses SPEAKING without pronunciation', async () => {
    await expect(
      service.createWithMeanings(
        { questionJp: '話す', questionType: 'SPEAKING' },
        1,
        true
      )
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { errorKey: 'question_bank.PRONUNCIATION_REQUIRED' }
    })
  })

  it('a repeated questionJp is a 409; LISTENING without audio gets speech; "" is stored as null', async () => {
    repo.questionJpTaken.mockResolvedValue(true)
    await expect(
      service.createWithMeanings({ questionJp: '同じ', questionType: 'VOCABULARY' }, 1)
    ).rejects.toMatchObject({ status: HttpStatus.CONFLICT })

    repo.questionJpTaken.mockResolvedValue(false)
    await service.createWithMeanings({ questionJp: '聞く', questionType: 'LISTENING' }, 1)
    await service.createWithMeanings(
      { questionJp: '読む', questionType: 'VOCABULARY', audioUrl: ' ' },
      1
    )
    expect(repo.createWithMeanings.mock.calls.map(([data]) => data.audioUrl)).toEqual([
      'https://audio/9.mp3',
      null
    ])
  })

  it('update: 404 when missing; the duplicate check skips the question itself', async () => {
    repo.findById.mockResolvedValueOnce(null)
    await expect(service.updateWithMeanings(9, { levelN: 3 })).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'question_bank.NOT_FOUND' }
    })

    await service.updateWithMeanings(9, { questionJp: '新しい' })
    expect(repo.questionJpTaken).toHaveBeenCalledWith('新しい', 9)
  })

  it('createWithAnswers: 207 with translated reasons and counts', async () => {
    answers.createAnswer.mockResolvedValueOnce({ data: { id: 1 } })
    answers.createAnswer.mockRejectedValueOnce(new Error('x'))
    answers.failureReason.mockReturnValue('answer.UNKNOWN_FAILURE')

    const res = await service.createWithAnswers(
      {
        questionJp: '質問',
        questionType: 'VOCABULARY',
        answers: [
          { answerJp: '一', isCorrect: true },
          { answerJp: '二', isCorrect: false }
        ]
      },
      1,
      'en'
    )
    expect(res.statusCode).toBe(207)
    expect(res.message).toBe('question_bank.WITH_ANSWERS_PARTIAL {"created":1,"total":2}')
    expect(res.data.failedAnswers).toEqual([
      { answerJp: '二', reason: 'answer.UNKNOWN_FAILURE' }
    ])
    expect(answers.failureReason).toHaveBeenCalledWith(expect.any(Error), 'en')
  })

  it('bulk delete of ids that do not exist is a 404 (was a 400)', async () => {
    repo.deleteMany.mockResolvedValue({ deletedCount: 0, deletedIds: [] })
    await expect(service.removeMany([5])).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { errorKey: 'question_bank.NONE_DELETED' }
    })
  })
})

describe('CreateQuestionBankWithAnswersBodySchema', () => {
  const messages = (body: object) => {
    const result = CreateQuestionBankWithAnswersBodySchema.safeParse({
      questionType: 'VOCABULARY',
      answers: [{ answerJp: 'a', isCorrect: true }],
      ...body
    })
    return result.success ? [] : result.error.issues.map((i) => i.message)
  }

  it('questionJp needs Japanese or a blank: Latin text passed the old regex (its ranges were broken)', () => {
    expect(messages({ questionJp: 'What is this?' })).toEqual([
      'question_bank.QUESTION_JP_NOT_JAPANESE'
    ])
    expect(messages({ questionJp: '私は＿＿です' })).toEqual([])
    expect(messages({ questionJp: 'I am ___' })).toEqual([])
  })

  it('answer rules: exactly one correct; MATCHING one answer; SPEAKING needs pronunciation', () => {
    const two = (a: boolean, b: boolean) => [
      { answerJp: '一', isCorrect: a },
      { answerJp: '二', isCorrect: b }
    ]
    expect(messages({ questionJp: '問', answers: two(true, true) })).toEqual([
      'question_bank.ONLY_ONE_CORRECT_ANSWER'
    ])
    expect(messages({ questionJp: '問', answers: two(false, false) })).toEqual([
      'question_bank.CORRECT_ANSWER_REQUIRED'
    ])
    expect(
      messages({ questionJp: '問', questionType: 'MATCHING', answers: two(true, false) })
    ).toEqual(['question_bank.MATCHING_SINGLE_ANSWER'])
    expect(messages({ questionJp: '話', questionType: 'SPEAKING' })).toEqual([
      'question_bank.PRONUNCIATION_REQUIRED'
    ])
  })
})
