import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 4a baseline: question-bank, answer, testset,
// testset-questionbank (quiz authoring). Only the admin web calls them; the
// requests below are the ones its services send (src/services/questionBank,
// answer, testSet). Success and errors, errors in vi and en. The refactor must
// keep these snapshots; intended changes update them in the same commit.
describe('Quiz batch 4a contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let startedAt: Date
  const created = { languages: [] as number[] }

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
      .auth(token, { type: 'bearer' })
  const capture = (res: request.Response) => ({
    httpStatus: res.status,
    body: responseShape(res.body)
  })
  const both = async (send: (lang: string) => request.Test) => ({
    vi: capture(await send('vi')),
    en: capture(await send('en'))
  })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)
    for (const [code, name] of [
      ['vi', 'Tiếng Việt'],
      ['en', 'English']
    ]) {
      if (await prisma.languages.findUnique({ where: { code } })) continue
      created.languages.push((await prisma.languages.create({ data: { code, name } })).id)
    }
    token = await loginAsTestAdmin(app, [
      { method: 'POST', path: '/question-bank/with-answers' },
      { method: 'POST', path: '/question-bank/bulk' },
      { method: 'PUT', path: '/question-bank/bulk' },
      { method: 'GET', path: '/question-bank' },
      { method: 'GET', path: '/question-bank/:id' },
      { method: 'PUT', path: '/question-bank/:id' },
      { method: 'DELETE', path: '/question-bank/bulk' },
      { method: 'DELETE', path: '/question-bank/:id' },
      { method: 'POST', path: '/answers/multiple' },
      { method: 'GET', path: '/answers' },
      { method: 'GET', path: '/answers/:id' },
      { method: 'PUT', path: '/answers/:id' },
      { method: 'DELETE', path: '/answers/:id' },
      { method: 'POST', path: '/testset/with-meanings' },
      { method: 'POST', path: '/testset/upsert-with-question-banks' },
      { method: 'GET', path: '/testset' },
      { method: 'GET', path: '/testset/:id/with-question-banks-full' },
      { method: 'PUT', path: '/testset/:id/with-meanings' },
      { method: 'DELETE', path: '/testset/:id' },
      { method: 'POST', path: '/testset-questionbank/multiple' },
      { method: 'GET', path: '/testset-questionbank/testset/:testSetId/full' },
      { method: 'DELETE', path: '/testset-questionbank/delete-many' }
    ])
    startedAt = new Date()
  })

  // Leave the test DB as it was: everything these routes created during the
  // run (answers and test set links cascade)
  afterAll(async () => {
    if (prisma && startedAt) {
      const since = { createdAt: { gte: startedAt } }
      await prisma.testSet.deleteMany({ where: since })
      await prisma.questionBank.deleteMany({ where: since })
      await prisma.translation.deleteMany({ where: since })
      await prisma.languages.deleteMany({ where: { id: { in: created.languages } } })
    }
    await app?.close()
  })

  // Ids from the answer, else from the DB (a route may save but answer 500)
  const newest = async (table: 'questionBank' | 'testSet' | 'answer') =>
    (
      await (
        prisma[table] as unknown as {
          findFirstOrThrow: (a: object) => Promise<{ id: number }>
        }
      ).findFirstOrThrow({
        where: { createdAt: { gte: startedAt } },
        orderBy: { id: 'desc' }
      })
    ).id

  let questionBankId: number
  let testSetId: number

  describe('question-bank', () => {
    it('create with answers, list, detail, update', async () => {
      const create = await http()
        .post('/question-bank/with-answers')
        .send({
          questionJp: '契約テストの質問',
          questionType: 'VOCABULARY',
          levelN: 5,
          meanings: [
            { translations: { vi: 'Câu hỏi kiểm thử', en: 'Contract question' } }
          ],
          answers: [
            {
              answerJp: '正しい',
              isCorrect: true,
              translations: {
                meaning: [
                  { language_code: 'vi', value: 'Đúng' },
                  { language_code: 'en', value: 'Right' }
                ]
              }
            },
            { answerJp: '違う', isCorrect: false }
          ]
        })
      questionBankId = create.body.data?.id ?? (await newest('questionBank'))
      expect({
        create: capture(create),
        list: capture(
          await http()
            .get('/question-bank')
            .query({ currentPage: '1', pageSize: '5', search: '契約テストの質問' })
        ),
        detail: capture(await http().get(`/question-bank/${questionBankId}`)),
        update: capture(
          await http().put(`/question-bank/${questionBankId}`).send({ levelN: 4 })
        )
      }).toMatchSnapshot()
    })

    it('errors, and the bulk create/update the web calls', async () => {
      expect({
        notFound: await both((l) => http(l).get('/question-bank/999999')),
        invalidId: await both((l) => http(l).get('/question-bank/abc')),
        invalidBody: await both((l) =>
          http(l).post('/question-bank/with-answers').send({ questionJp: 1, answers: [] })
        ),
        updateNotFound: await both((l) =>
          http(l).put('/question-bank/999999').send({ levelN: 3 })
        ),
        bulkCreate: capture(await http().post('/question-bank/bulk').send({ items: [] })),
        bulkUpdate: capture(await http().put('/question-bank/bulk').send({ items: [] }))
      }).toMatchSnapshot()
    })
  })

  describe('answer', () => {
    let id: number

    it('create (as the web form sends it), list, detail, update', async () => {
      const create = await http()
        .post('/answers/multiple')
        .send({ questionBankId, answers: [{ answerJp: '食べます', isCorrect: false }] })
      id = create.body.data?.results?.[0]?.id ?? (await newest('answer'))
      expect({
        create: capture(create),
        list: capture(
          await http()
            .get('/answers')
            .query({
              currentPage: '1',
              pageSize: '5',
              questionBankId: `${questionBankId}`
            })
        ),
        detail: capture(await http().get(`/answers/${id}`)),
        update: capture(await http().put(`/answers/${id}`).send({ isCorrect: false }))
      }).toMatchSnapshot()
    })

    it('errors, delete, delete again', async () => {
      expect({
        notFound: await both((l) => http(l).get('/answers/999999')),
        invalidId: await both((l) => http(l).get('/answers/abc')),
        invalidBody: await both((l) =>
          http(l).post('/answers/multiple').send({ questionBankId, answers: [] })
        ),
        missingQuestion: await both((l) =>
          http(l)
            .post('/answers/multiple')
            .send({
              questionBankId: 999999,
              answers: [{ answerJp: 'なし', isCorrect: false }]
            })
        ),
        delete: capture(await http().delete(`/answers/${id}`)),
        deleteAgain: await both((l) => http(l).delete(`/answers/${id}`))
      }).toMatchSnapshot()
    })
  })

  describe('testset and testset-questionbank', () => {
    let linkId: number

    it('create with meanings, list, update, upsert with question banks, full detail', async () => {
      const create = await http()
        .post('/testset/with-meanings')
        .send({
          testType: 'VOCABULARY',
          levelN: 5,
          meanings: [
            {
              field: 'name',
              translations: { vi: 'Bộ đề kiểm thử', en: 'Contract test set' }
            },
            { field: 'description', translations: { vi: 'Mô tả', en: 'Description' } }
          ]
        })
      testSetId = create.body.data?.id ?? (await newest('testSet'))
      expect({
        create: capture(create),
        list: capture(
          await http().get('/testset').query({
            currentPage: '1',
            pageSize: '5',
            levelN: '5',
            testType: 'VOCABULARY'
          })
        ),
        update: capture(
          await http().put(`/testset/${testSetId}/with-meanings`).send({ levelN: 4 })
        ),
        upsert: capture(
          await http()
            .post('/testset/upsert-with-question-banks')
            .send({
              id: testSetId,
              questionBanks: [
                {
                  questionJp: '契約テストの別の質問',
                  questionType: 'VOCABULARY',
                  meanings: [{ translations: { vi: 'Câu khác', en: 'Another' } }]
                }
              ]
            })
        ),
        full: capture(await http().get(`/testset/${testSetId}/with-question-banks-full`))
      }).toMatchSnapshot()
    })

    it('link question banks, read the links, delete them', async () => {
      const link = await http()
        .post('/testset-questionbank/multiple')
        .send({ testSetId, questionBankIds: [questionBankId] })
      linkId = (
        await prisma.testSetQuestionBank.findFirstOrThrow({
          where: { testSetId, questionBankId }
        })
      ).id
      expect({
        link: capture(link),
        linkAgain: await both((l) =>
          http(l)
            .post('/testset-questionbank/multiple')
            .send({ testSetId, questionBankIds: [questionBankId] })
        ),
        full: capture(
          await http().get(`/testset-questionbank/testset/${testSetId}/full`)
        ),
        deleteMany: capture(
          await http()
            .delete('/testset-questionbank/delete-many')
            .send({ ids: [linkId] })
        )
      }).toMatchSnapshot()
    })

    it('errors, delete test set, delete again', async () => {
      expect({
        fullNotFound: await both((l) =>
          http(l).get('/testset/999999/with-question-banks-full')
        ),
        fullInvalidId: await both((l) =>
          http(l).get('/testset/abc/with-question-banks-full')
        ),
        readingWithoutContent: await both((l) =>
          http(l)
            .post('/testset/with-meanings')
            .send({
              testType: 'READING',
              meanings: [{ field: 'name', translations: { vi: 'x', en: 'x' } }]
            })
        ),
        linksInvalidId: await both((l) =>
          http(l).get('/testset-questionbank/testset/abc/full')
        ),
        linkInvalidBody: await both((l) =>
          http(l).post('/testset-questionbank/multiple').send({ testSetId: 'x' })
        ),
        deleteManyInvalidBody: await both((l) =>
          http(l).delete('/testset-questionbank/delete-many').send({ ids: 'x' })
        ),
        delete: capture(await http().delete(`/testset/${testSetId}`)),
        deleteAgain: await both((l) => http(l).delete(`/testset/${testSetId}`))
      }).toMatchSnapshot()
    })
  })

  describe('question-bank delete', () => {
    it('bulk delete, delete one, delete again', async () => {
      const other = await prisma.questionBank.create({
        data: { questionJp: '契約テストの一括削除', questionType: 'VOCABULARY' }
      })
      expect({
        bulkDelete: capture(
          await http()
            .delete('/question-bank/bulk')
            .send({ ids: [other.id] })
        ),
        bulkDeleteInvalid: await both((l) =>
          http(l).delete('/question-bank/bulk').send({ ids: [] })
        ),
        delete: capture(await http().delete(`/question-bank/${questionBankId}`)),
        deleteAgain: await both((l) => http(l).delete(`/question-bank/${questionBankId}`))
      }).toMatchSnapshot()
    })
  })
})
