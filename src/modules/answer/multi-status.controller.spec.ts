import { QuestionBankController } from '@/modules/question-bank/question-bank.controller'
import { TestSetQuestionBankController } from '@/modules/testset-questionbank/testset-questionbank.controller'
import { AnswerController } from './answer.controller'

// Batch writes that save item by item answer with the outcome as the HTTP
// status: 201 all saved, 207 some, 400 none (answers: 200 when some were
// updated). The services count; the controllers pick the status and message.
const i18n = {
  translate: (key: string, _lang: string, args?: object) =>
    args ? `${key} ${JSON.stringify(args)}` : key
}
const fakeRes = () => {
  const sent: { status?: number; body?: unknown } = {}
  const res = {
    status: (code: number) => {
      sent.status = code
      return res
    },
    json: (body: unknown) => {
      sent.body = body
      return res
    }
  }
  return { res: res as never, sent }
}

describe('multi-status batch routes', () => {
  it('POST /answer/multiple: 201 / 207 / 200 / 400', async () => {
    const service = { createMultiple: jest.fn() }
    const controller = new AnswerController(service as never, i18n as never)
    const cases: [object, number, string][] = [
      [{ created: 2, updated: 0, failed: 0 }, 201, 'answer.MULTIPLE_CREATED'],
      [{ created: 1, updated: 0, failed: 1 }, 207, 'answer.MULTIPLE_CREATED_FAILED'],
      [{ created: 0, updated: 1, failed: 1 }, 207, 'answer.MULTIPLE_UPDATED_FAILED'],
      [
        { created: 1, updated: 1, failed: 1 },
        207,
        'answer.MULTIPLE_CREATED_UPDATED_FAILED'
      ],
      [{ created: 1, updated: 1, failed: 0 }, 200, 'answer.MULTIPLE_CREATED_UPDATED'],
      [{ created: 0, updated: 0, failed: 2 }, 400, 'answer.MULTIPLE_NONE_SAVED']
    ]
    for (const [summary, status, key] of cases) {
      const data = {
        created: [],
        updated: [],
        failed: [],
        summary: { total: 2, ...summary }
      }
      service.createMultiple.mockResolvedValue(data)
      const { res, sent } = fakeRes()
      await controller.createMultipleAnswers({} as never, res, 'en')
      expect(sent.status).toBe(status)
      expect(sent.body).toMatchObject({ statusCode: status, data })
      expect((sent.body as { message: string }).message.startsWith(key + ' ')).toBe(true)
    }
    expect(service.createMultiple).toHaveBeenCalledWith({}, 'en')
  })

  it('POST /question-bank/with-answers: 201 / 207 / 400 with created/total', async () => {
    const service = { createWithAnswers: jest.fn() }
    const controller = new QuestionBankController(service as never, i18n as never)
    const body = { answers: [{}, {}] } as never
    const cases: [number, number, number, string][] = [
      [2, 0, 201, 'question_bank.WITH_ANSWERS_CREATED {"created":2,"total":2}'],
      [1, 1, 207, 'question_bank.WITH_ANSWERS_PARTIAL {"created":1,"total":2}'],
      [0, 2, 400, 'question_bank.WITH_ANSWERS_NONE {"created":0,"total":2}']
    ]
    for (const [createdCount, failedCount, status, message] of cases) {
      const data = { questionBank: { id: 1 }, answers: [], createdCount, failedCount }
      service.createWithAnswers.mockResolvedValue(data)
      const { res, sent } = fakeRes()
      await controller.createWithAnswers(body, 7, 'en', res)
      expect(sent).toEqual({ status, body: { statusCode: status, data, message } })
    }
    expect(service.createWithAnswers).toHaveBeenCalledWith(body, 7, 'en')
  })

  it('POST /testset-questionbank/multiple: 201 / 207 / 400 with created/total/failed', async () => {
    const service = { createMultiple: jest.fn() }
    const controller = new TestSetQuestionBankController(service as never, i18n as never)
    const cases: [number, number, number, string][] = [
      [
        3,
        0,
        201,
        'testset_questionbank.MULTIPLE_CREATED {"created":3,"total":3,"failed":0}'
      ],
      [
        1,
        2,
        207,
        'testset_questionbank.MULTIPLE_PARTIAL {"created":1,"total":3,"failed":2}'
      ],
      [
        0,
        3,
        400,
        'testset_questionbank.MULTIPLE_NONE_CREATED {"created":0,"total":3,"failed":3}'
      ]
    ]
    for (const [success, failed, status, message] of cases) {
      const data = { created: [], failed: [], summary: { total: 3, success, failed } }
      service.createMultiple.mockResolvedValue(data)
      const { res, sent } = fakeRes()
      await controller.createMultiple({} as never, 'en', res)
      expect(sent).toEqual({ status, body: { statusCode: status, data, message } })
    }
  })
})
