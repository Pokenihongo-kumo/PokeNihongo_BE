import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 5c baseline: user-exercise-attempt, user-answer-log. The
// exercise flow of the mobile app (src/services/user-exercise-attempt,
// user-answer-log), in its order: start an attempt, the lesson's latest
// attempts, the questions, answer, check, submit, review, continue, abandon,
// and the history the app asks for. The lesson, its exercise and questions are
// made here (no rewards, so no wallet change). Errors in vi and en.
describe('User progress batch 5c contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let userId: number
  let startedAt: Date
  const created = {
    languages: [] as number[],
    category: 0,
    lesson: 0,
    exercise: 0,
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
      { method: 'POST', path: '/user-exercise-attempt/:exerciseId' },
      { method: 'GET', path: '/user-exercise-attempt/latest/lesson/:lessonId' },
      { method: 'GET', path: '/user-exercise-attempt/exercise/:id' },
      { method: 'GET', path: '/user-exercise-attempt/:id/check-completion' },
      { method: 'PUT', path: '/user-exercise-attempt/:id/submit-completion' },
      { method: 'GET', path: '/user-exercise-attempt/exercise/:id/review' },
      { method: 'PUT', path: '/user-exercise-attempt/:id' },
      { method: 'PUT', path: '/user-exercise-attempt/:id/abandon' },
      { method: 'GET', path: '/user-exercise-attempt/:id' },
      { method: 'POST', path: '/user-answer-log/upsert' }
    ])
    userId = (await prisma.user.findUniqueOrThrow({ where: { email: TEST_ADMIN.email } }))
      .id
    startedAt = new Date()
    const stamp = startedAt.getTime()

    created.category = (
      await prisma.lessonCategory.create({
        data: { nameKey: `contract.5c.${stamp}`, slug: `contract-5c-${stamp}` }
      })
    ).id
    created.lesson = (
      await prisma.lesson.create({
        data: {
          slug: `contract-5c-${stamp}`,
          titleJp: '契約テストの練習',
          titleKey: `contract.5c.${stamp}.title`,
          levelJlpt: 5,
          lessonCategoryId: created.category,
          createdById: userId
        }
      })
    ).id
    await prisma.userProgress.create({
      data: {
        userId,
        lessonId: created.lesson,
        status: 'IN_PROGRESS',
        progressPercentage: 0,
        lastAccessedAt: new Date()
      }
    })
    created.testSet = (
      await prisma.testSet.create({
        data: { name: 'contract.5c', testType: 'VOCABULARY', status: 'ACTIVE', levelN: 5 }
      })
    ).id
    created.question = (
      await prisma.questionBank.create({
        data: { questionJp: '契約テストの問題', questionType: 'VOCABULARY', levelN: 5 }
      })
    ).id
    created.rightAnswer = (
      await prisma.answer.create({
        data: {
          answerJp: '正しい',
          answerKey: `contract.5c.${stamp}.right`,
          isCorrect: true,
          questionBankId: created.question
        }
      })
    ).id
    await prisma.answer.create({
      data: {
        answerJp: '違う',
        answerKey: `contract.5c.${stamp}.wrong`,
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
    created.exercise = (
      await prisma.exercises.create({
        data: {
          exerciseType: 'VOCABULARY',
          lessonId: created.lesson,
          testSetId: created.testSet
        }
      })
    ).id
  })

  // Attempts, answer logs, progress and links cascade from the lesson,
  // the test set and the question
  afterAll(async () => {
    if (prisma && startedAt) {
      await prisma.lesson.deleteMany({ where: { id: created.lesson } })
      await prisma.testSet.deleteMany({ where: { id: created.testSet } })
      await prisma.questionBank.deleteMany({ where: { id: created.question } })
      await prisma.lessonCategory.deleteMany({ where: { id: created.category } })
      await prisma.languages.deleteMany({ where: { id: { in: created.languages } } })
    }
    await app?.close()
  })

  it('start, latest of the lesson, questions, answer, check, submit, review', async () => {
    const start = await http().post(`/user-exercise-attempt/${created.exercise}`)
    attemptId =
      start.body.data?.id ??
      (
        await prisma.userExerciseAttempt.findFirstOrThrow({
          where: { userId, exerciseId: created.exercise },
          orderBy: { id: 'desc' }
        })
      ).id
    expect({
      start: capture(start),
      latest: capture(
        await http().get(`/user-exercise-attempt/latest/lesson/${created.lesson}`)
      ),
      questions: capture(
        await http().get(`/user-exercise-attempt/exercise/${attemptId}`)
      ),
      answer: capture(
        await http().post('/user-answer-log/upsert').send({
          userExerciseAttemptId: attemptId,
          questionBankId: created.question,
          answerId: created.rightAnswer
        })
      ),
      check: capture(
        await http().get(`/user-exercise-attempt/${attemptId}/check-completion`)
      ),
      submit: capture(
        await http()
          .put(`/user-exercise-attempt/${attemptId}/submit-completion`)
          .send({ time: 30 })
      ),
      review: capture(
        await http().get(`/user-exercise-attempt/exercise/${attemptId}/review`)
      )
    }).toMatchSnapshot()
  })

  it('a second attempt: continue, abandon, and the history the app asks for', async () => {
    const second = await http().post(`/user-exercise-attempt/${created.exercise}`)
    const secondId =
      second.body.data?.id ??
      (
        await prisma.userExerciseAttempt.findFirstOrThrow({
          where: { userId, exerciseId: created.exercise },
          orderBy: { id: 'desc' }
        })
      ).id
    expect({
      second: capture(second),
      continue: capture(
        await http()
          .put(`/user-exercise-attempt/${secondId}`)
          .send({ status: 'IN_PROGRESS' })
      ),
      abandon: capture(
        await http().put(`/user-exercise-attempt/${secondId}/abandon`).send({ time: 10 })
      ),
      // src/services/user-exercise-attempt getExerciseHistory: no such route
      history: await both((l) =>
        http(l)
          .get('/user-exercise-attempt/history')
          .query({ currentPage: '1', pageSize: '10' })
      )
    }).toMatchSnapshot()
  })

  it('errors', async () => {
    expect({
      startMissingExercise: await both((l) =>
        http(l).post('/user-exercise-attempt/999999')
      ),
      startInvalidId: await both((l) => http(l).post('/user-exercise-attempt/abc')),
      latestInvalidLesson: await both((l) =>
        http(l).get('/user-exercise-attempt/latest/lesson/abc')
      ),
      questionsMissing: await both((l) =>
        http(l).get('/user-exercise-attempt/exercise/999999')
      ),
      checkMissing: await both((l) =>
        http(l).get('/user-exercise-attempt/999999/check-completion')
      ),
      submitInvalidBody: await both((l) =>
        http(l)
          .put(`/user-exercise-attempt/${attemptId}/submit-completion`)
          .send({ time: 'x' })
      ),
      answerInvalidBody: await both((l) =>
        http(l).post('/user-answer-log/upsert').send({ userExerciseAttemptId: 'x' })
      ),
      answerMissingAttempt: await both((l) =>
        http(l).post('/user-answer-log/upsert').send({
          userExerciseAttemptId: 999999,
          questionBankId: created.question,
          answerId: created.rightAnswer
        })
      )
    }).toMatchSnapshot()
  })
})
