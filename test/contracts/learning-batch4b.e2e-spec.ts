import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 4b baseline: lesson, exercises, test. The requests below are
// the ones the clients send: admin web (src/services/lesson, exercise, test)
// and mobile (src/services/lesson, exercise, quiz, user-test). Success and
// errors, errors in vi and en. The refactor must keep these snapshots;
// intended changes update them in the same commit.
describe('Learning batch 4b contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let startedAt: Date
  const created = { languages: [] as number[], lessonCategory: 0 }

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
      .auth(token, { type: 'bearer' })
  // Some messages carry a record id, which changes every run: ids become N
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
  // A list whose items depend on what the test DB already holds: keep the
  // envelope, not the item shape
  const captureList = (res: request.Response) => {
    const { results, ...rest } = (res.body?.data ?? {}) as { results?: unknown }
    return {
      httpStatus: res.status,
      body: responseShape({
        ...res.body,
        data: { ...rest, results: Array.isArray(results) }
      })
    }
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
      { method: 'GET', path: '/lessons' },
      { method: 'POST', path: '/lessons' },
      { method: 'GET', path: '/lessons/:id' },
      { method: 'PUT', path: '/lessons/:id' },
      { method: 'GET', path: '/exercises/lesson/:lessonId' },
      { method: 'POST', path: '/exercises' },
      { method: 'PUT', path: '/exercises/:id' },
      { method: 'DELETE', path: '/exercises/:id' },
      { method: 'GET', path: '/test' },
      { method: 'POST', path: '/test/with-meanings' },
      { method: 'GET', path: '/test/:id' },
      { method: 'PUT', path: '/test/:id/with-meanings' },
      { method: 'POST', path: '/test/:id/testSets' },
      { method: 'DELETE', path: '/test/:id/testSets' },
      { method: 'POST', path: '/test/lesson/:lessonId/testSets' },
      { method: 'POST', path: '/test/auto-add-free-testsets' },
      { method: 'GET', path: '/test/:id/full-user' },
      { method: 'GET', path: '/test/:id/placement-questions' },
      { method: 'GET', path: '/test/lesson-review/:testId/questions' }
    ])
    startedAt = new Date()
    created.lessonCategory = (
      await prisma.lessonCategory.create({
        data: {
          nameKey: `contract.4b.${startedAt.getTime()}`,
          slug: `contract-4b-${startedAt.getTime()}`
        }
      })
    ).id
  })

  // Leave the test DB as it was: everything created during the run (exercises,
  // links and attempts cascade from their lesson/test/test set)
  afterAll(async () => {
    if (prisma && startedAt) {
      const since = { createdAt: { gte: startedAt } }
      await prisma.testTestSet.deleteMany({ where: since })
      await prisma.userTestAttempt.deleteMany({ where: since })
      await prisma.lesson.deleteMany({ where: since })
      await prisma.test.deleteMany({ where: since })
      await prisma.testSet.deleteMany({ where: since })
      await prisma.translation.deleteMany({ where: since })
      if (created.lessonCategory) {
        await prisma.lessonCategory.deleteMany({ where: { id: created.lessonCategory } })
      }
      await prisma.languages.deleteMany({ where: { id: { in: created.languages } } })
    }
    await app?.close()
  })

  // Ids from the answer, else from the DB (a route may save but answer 500)
  const newest = async (table: 'lesson' | 'exercises' | 'test') =>
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

  const newTestSet = async (name: string) =>
    (
      await prisma.testSet.create({
        data: { name, testType: 'VOCABULARY', status: 'ACTIVE', levelN: 5, price: 0 }
      })
    ).id

  let lessonId: number
  let exerciseId: number
  let testId: number

  describe('lessons', () => {
    it('create, list (web query and mobile), detail, update', async () => {
      const create = await http()
        .post('/lessons')
        .send({
          titleJp: '契約テストの課',
          levelJlpt: 5,
          estimatedTimeMinutes: 20,
          lessonCategoryId: created.lessonCategory,
          translations: {
            meaning: [
              { language_code: 'vi', value: 'Bài kiểm thử' },
              { language_code: 'en', value: 'Contract lesson' }
            ]
          }
        })
      lessonId = create.body.data?.id ?? (await newest('lesson'))
      expect({
        create: capture(create),
        listWeb: capture(
          await http()
            .get('/lessons')
            .query({
              currentPage: '1',
              pageSize: '5',
              search: '契約テストの課',
              lessonCategoryId: String(created.lessonCategory),
              levelJlpt: '5',
              sortBy: 'createdAt',
              sort: 'desc'
            })
        ),
        listMobile: captureList(await http().get('/lessons')),
        detail: capture(await http().get(`/lessons/${lessonId}`)),
        update: capture(
          await http().put(`/lessons/${lessonId}`).send({ estimatedTimeMinutes: 25 })
        )
      }).toMatchSnapshot()
    })

    it('errors', async () => {
      expect({
        notFound: await both((l) => http(l).get('/lessons/999999')),
        invalidId: await both((l) => http(l).get('/lessons/abc')),
        invalidBody: await both((l) => http(l).post('/lessons').send({ titleJp: 1 })),
        updateNotFound: await both((l) =>
          http(l).put('/lessons/999999').send({ estimatedTimeMinutes: 25 })
        )
      }).toMatchSnapshot()
    })
  })

  describe('exercises', () => {
    it('create, list by lesson (web and mobile), update', async () => {
      const testSetId = await newTestSet('contract.4b.exercise')
      const create = await http()
        .post('/exercises')
        .send({ exerciseType: 'VOCABULARY', lessonId, testSetId })
      exerciseId = create.body.data?.id ?? (await newest('exercises'))
      expect({
        create: capture(create),
        byLesson: capture(await http().get(`/exercises/lesson/${lessonId}`)),
        update: capture(
          await http().put(`/exercises/${exerciseId}`).send({ isBlocked: true })
        )
      }).toMatchSnapshot()
    })

    it('errors, delete, delete again', async () => {
      expect({
        byLessonInvalidId: await both((l) => http(l).get('/exercises/lesson/abc')),
        invalidBody: await both((l) =>
          http(l).post('/exercises').send({ exerciseType: 'nope', lessonId: 'x' })
        ),
        updateNotFound: await both((l) =>
          http(l).put('/exercises/999999').send({ isBlocked: true })
        ),
        delete: capture(await http().delete(`/exercises/${exerciseId}`)),
        deleteAgain: await both((l) => http(l).delete(`/exercises/${exerciseId}`))
      }).toMatchSnapshot()
    })
  })

  describe('test', () => {
    it('create, list, detail, update, link and unlink test sets', async () => {
      const create = await http()
        .post('/test/with-meanings')
        .send({
          testType: 'QUIZ_TEST',
          levelN: 5,
          meanings: [
            {
              field: 'name',
              translations: { vi: 'Bài test kiểm thử', en: 'Contract test' }
            },
            { field: 'description', translations: { vi: 'Mô tả', en: 'Description' } }
          ]
        })
      testId = create.body.data?.id ?? (await newest('test'))
      const testSetId = await newTestSet('contract.4b.link')
      expect({
        create: capture(create),
        list: capture(
          await http().get('/test').query({
            currentPage: '1',
            pageSize: '5',
            search: 'Contract test',
            levelN: '5',
            testType: 'QUIZ_TEST',
            status: 'DRAFT'
          })
        ),
        detail: capture(await http().get(`/test/${testId}`)),
        update: capture(
          await http().put(`/test/${testId}/with-meanings`).send({ status: 'ACTIVE' })
        ),
        link: capture(
          await http()
            .post(`/test/${testId}/testSets`)
            .send({ testSetIds: [testSetId] })
        ),
        unlink: capture(
          await http()
            .delete(`/test/${testId}/testSets`)
            .send({ testSetIds: [testSetId] })
        )
      }).toMatchSnapshot()
    })

    it('lesson review test, auto-add free test sets, what mobile reads', async () => {
      const testSetId = await newTestSet('contract.4b.review')
      const lessonLink = await http()
        .post(`/test/lesson/${lessonId}/testSets`)
        .send({ testSetIds: [testSetId] })
      const reviewTestId = (await prisma.lesson.findUnique({ where: { id: lessonId } }))
        ?.testId
      expect({
        lessonLink: capture(lessonLink),
        autoAdd: capture(await http().post('/test/auto-add-free-testsets')),
        fullUser: capture(await http().get(`/test/${testId}/full-user`)),
        placementQuestions: capture(
          await http().get(`/test/${testId}/placement-questions`)
        ),
        lessonReviewQuestions: capture(
          await http().get(`/test/lesson-review/${reviewTestId ?? testId}/questions`)
        )
      }).toMatchSnapshot()
    })

    it('errors', async () => {
      expect({
        notFound: await both((l) => http(l).get('/test/999999')),
        invalidId: await both((l) => http(l).get('/test/abc')),
        invalidBody: await both((l) =>
          http(l).post('/test/with-meanings').send({ testType: 'NOPE', meanings: [] })
        ),
        updateNotFound: await both((l) =>
          http(l).put('/test/999999/with-meanings').send({ status: 'ACTIVE' })
        ),
        linkInvalidBody: await both((l) =>
          http(l).post(`/test/${testId}/testSets`).send({ testSetIds: [] })
        ),
        fullUserNotFound: await both((l) => http(l).get('/test/999999/full-user'))
      }).toMatchSnapshot()
    })
  })
})
