import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 5d baseline: user-test, user-test-attempt, user-test-answer-log.
// The test flow of the mobile app (src/services/user-test), in its order: my
// tests, open a test (the attempt is made there), answer, check, submit,
// review, status; a second attempt, abandon (no body, as the app sends it) and
// delete. A free QUIZ_TEST with one question and no rewards, made here, so the
// wallet and the user's level do not change. Errors in vi and en.
describe('User progress batch 5d contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let userId: number
  let startedAt: Date
  const created = {
    languages: [] as number[],
    test: 0,
    testSet: 0,
    question: 0,
    rightAnswer: 0
  }
  let attemptId: number

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
      .auth(token, { type: 'bearer' })
  // Some messages carry a record id, which changes every run: digits become N
  const capture = (res: request.Response) => {
    const body = responseShape(res.body) as Record<string, unknown>
    if (typeof body?.message === 'string') {
      body.message = body.message.replace(/[0-9]+/g, 'N')
    }
    return { httpStatus: res.status, body }
  }
  const both = async (send: (lang: string) => request.Test) => ({
    vi: capture(await send('vi')),
    en: capture(await send('en'))
  })
  const openTest = async () => {
    const res = await http().get(`/user-test-attempt/test/${created.test}`)
    const id =
      res.body.data?.userTestAttemptId ??
      (
        await prisma.userTestAttempt.findFirstOrThrow({
          where: { userId, testId: created.test },
          orderBy: { id: 'desc' }
        })
      ).id
    return { res, id: id as number }
  }

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
      { method: 'GET', path: '/user-test/my' },
      { method: 'GET', path: '/user-test-attempt/test/:id' },
      { method: 'POST', path: '/user-test-answer-log/upsert' },
      { method: 'GET', path: '/user-test-attempt/:id/check-completion' },
      { method: 'PUT', path: '/user-test-attempt/:id/submit-completion' },
      { method: 'PUT', path: '/user-test-attempt/:id/placement-test/submit-completion' },
      { method: 'GET', path: '/user-test-attempt/test/:id/review' },
      { method: 'GET', path: '/user-test-attempt/lesson/test/:id/review' },
      { method: 'GET', path: '/user-test-attempt/:id/status' },
      { method: 'PUT', path: '/user-test-attempt/:id/abandon' },
      { method: 'DELETE', path: '/user-test-attempt/:id' }
    ])
    userId = (await prisma.user.findUniqueOrThrow({ where: { email: TEST_ADMIN.email } }))
      .id
    startedAt = new Date()
    const stamp = startedAt.getTime()

    created.testSet = (
      await prisma.testSet.create({
        data: { name: 'contract.5d', testType: 'VOCABULARY', status: 'ACTIVE', levelN: 5 }
      })
    ).id
    created.question = (
      await prisma.questionBank.create({
        data: { questionJp: '契約テストの試験', questionType: 'VOCABULARY', levelN: 5 }
      })
    ).id
    created.rightAnswer = (
      await prisma.answer.create({
        data: {
          answerJp: '正しい',
          answerKey: `contract.5d.${stamp}.right`,
          isCorrect: true,
          questionBankId: created.question
        }
      })
    ).id
    await prisma.answer.create({
      data: {
        answerJp: '違う',
        answerKey: `contract.5d.${stamp}.wrong`,
        isCorrect: false,
        questionBankId: created.question
      }
    })
    await prisma.testSetQuestionBank.create({
      data: {
        testSetId: created.testSet,
        questionBankId: created.question,
        questionOrder: 1
      }
    })
    created.test = (
      await prisma.test.create({
        data: {
          name: `contract.5d.${stamp}`,
          testType: 'QUIZ_TEST',
          status: 'ACTIVE',
          levelN: 5,
          limit: 0
        }
      })
    ).id
    await prisma.testTestSet.create({
      data: { testId: created.test, testSetId: created.testSet }
    })
    await prisma.userTest.create({
      data: { userId, testId: created.test, status: 'ACTIVE', limit: 0 }
    })
  })

  // User tests, attempts, answer logs and links cascade from the test, the
  // test set and the question
  afterAll(async () => {
    if (prisma && startedAt) {
      await prisma.test.deleteMany({ where: { id: created.test } })
      await prisma.testSet.deleteMany({ where: { id: created.testSet } })
      await prisma.questionBank.deleteMany({ where: { id: created.question } })
      await prisma.languages.deleteMany({ where: { id: { in: created.languages } } })
    }
    await app?.close()
  })

  it('my tests, open, answer, check, submit, review, status', async () => {
    const page = { currentPage: '1', pageSize: '10', type: 'QUIZ_TEST' }
    const my = capture(await http().get('/user-test/my').query(page))
    // The app may add testId (getMy params): it reaches Prisma as a string
    const myOfTest = capture(
      await http()
        .get('/user-test/my')
        .query({ ...page, testId: String(created.test) })
    )
    const open = await openTest()
    attemptId = open.id
    expect({
      my,
      myOfTest,
      open: capture(open.res),
      answer: capture(
        await http().post('/user-test-answer-log/upsert').send({
          userTestAttemptId: attemptId,
          questionBankId: created.question,
          answerId: created.rightAnswer
        })
      ),
      check: capture(
        await http().get(`/user-test-attempt/${attemptId}/check-completion`)
      ),
      submit: capture(
        await http()
          .put(`/user-test-attempt/${attemptId}/submit-completion`)
          .send({ time: 30 })
      ),
      review: capture(await http().get(`/user-test-attempt/test/${attemptId}/review`)),
      status: capture(await http().get(`/user-test-attempt/${attemptId}/status`))
    }).toMatchSnapshot()
  })

  it('a second attempt: abandon (no body), then delete', async () => {
    const second = await openTest()
    expect({
      second: capture(second.res),
      abandon: capture(await http().put(`/user-test-attempt/${second.id}/abandon`)),
      remove: capture(await http().delete(`/user-test-attempt/${second.id}`))
    }).toMatchSnapshot()
  })

  it('errors', async () => {
    expect({
      openNoUserTest: await both((l) => http(l).get('/user-test-attempt/test/999999')),
      openInvalidId: await both((l) => http(l).get('/user-test-attempt/test/abc')),
      checkMissing: await both((l) =>
        http(l).get('/user-test-attempt/999999/check-completion')
      ),
      submitMissing: await both((l) =>
        http(l).put('/user-test-attempt/999999/submit-completion').send({ time: 1 })
      ),
      submitInvalidBody: await both((l) =>
        http(l)
          .put(`/user-test-attempt/${attemptId}/submit-completion`)
          .send({ time: 'x' })
      ),
      placementMissing: await both((l) =>
        http(l).put('/user-test-attempt/999999/placement-test/submit-completion').send({})
      ),
      reviewMissing: await both((l) =>
        http(l).get('/user-test-attempt/test/999999/review')
      ),
      lessonReviewMissing: await both((l) =>
        http(l).get('/user-test-attempt/lesson/test/999999/review')
      ),
      statusInvalidId: await both((l) => http(l).get('/user-test-attempt/abc/status')),
      abandonMissing: await both((l) => http(l).put('/user-test-attempt/999999/abandon')),
      answerInvalidBody: await both((l) =>
        http(l).post('/user-test-answer-log/upsert').send({ userTestAttemptId: 'x' })
      ),
      answerMissingAttempt: await both((l) =>
        http(l).post('/user-test-answer-log/upsert').send({
          userTestAttemptId: 999999,
          questionBankId: created.question,
          answerId: created.rightAnswer
        })
      ),
      myBadPageSize: await both((l) =>
        http(l).get('/user-test/my').query({ pageSize: 'abc' })
      )
    }).toMatchSnapshot()
  })
})
