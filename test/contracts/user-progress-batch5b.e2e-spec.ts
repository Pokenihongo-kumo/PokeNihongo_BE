import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 5b baseline: user-progress, user-history. Only the mobile
// app calls them, read-only (src/services/user-progres, user-history): the
// lessons of a category with the user's progress, and the exercise/test
// history. The rows are the test user's own, made here. Success and errors,
// errors in vi and en. The refactor must keep these snapshots.
describe('User progress batch 5b contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let userId: number
  let startedAt: Date
  const created = {
    languages: [] as number[],
    category: 0,
    lesson: 0,
    testSet: 0,
    test: 0
  }

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
      { method: 'GET', path: '/user-progress/my' },
      { method: 'GET', path: '/user-history/history-exercises' },
      { method: 'GET', path: '/user-history/history-tests' },
      { method: 'GET', path: '/user-history/recent-exercises' }
    ])
    userId = (await prisma.user.findUniqueOrThrow({ where: { email: TEST_ADMIN.email } }))
      .id
    startedAt = new Date()
    const stamp = startedAt.getTime()

    created.category = (
      await prisma.lessonCategory.create({
        data: { nameKey: `contract.5b.${stamp}`, slug: `contract-5b-${stamp}` }
      })
    ).id
    created.lesson = (
      await prisma.lesson.create({
        data: {
          slug: `contract-5b-${stamp}`,
          titleJp: '契約テストの進捗',
          titleKey: `contract.5b.${stamp}.title`,
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
        progressPercentage: 30,
        lastAccessedAt: new Date()
      }
    })
    created.testSet = (
      await prisma.testSet.create({
        data: { name: 'contract.5b', testType: 'VOCABULARY', status: 'ACTIVE', levelN: 5 }
      })
    ).id
    const exercise = await prisma.exercises.create({
      data: {
        exerciseType: 'VOCABULARY',
        lessonId: created.lesson,
        testSetId: created.testSet
      }
    })
    await prisma.userExerciseAttempt.create({
      data: { userId, exerciseId: exercise.id, status: 'COMPLETED', time: 120 }
    })
    created.test = (
      await prisma.test.create({
        data: {
          name: 'contract.5b.test',
          testType: 'QUIZ_TEST',
          status: 'ACTIVE',
          levelN: 5
        }
      })
    ).id
    await prisma.userTestAttempt.create({
      data: { userId, testId: created.test, status: 'COMPLETED', score: 80, time: 300 }
    })
  })

  // Progress, exercises and attempts cascade from the lesson, test and test set
  afterAll(async () => {
    if (prisma && startedAt) {
      await prisma.userTestAttempt.deleteMany({ where: { userId, testId: created.test } })
      await prisma.test.deleteMany({ where: { id: created.test } })
      await prisma.lesson.deleteMany({ where: { id: created.lesson } })
      await prisma.testSet.deleteMany({ where: { id: created.testSet } })
      await prisma.lessonCategory.deleteMany({ where: { id: created.category } })
      await prisma.languages.deleteMany({ where: { id: { in: created.languages } } })
    }
    await app?.close()
  })

  it('user-progress: lessons of a category with my progress (as learn.tsx asks)', async () => {
    const query = {
      currentPage: '1',
      pageSize: '50',
      lessonCategoryId: String(created.category)
    }
    expect({
      my: await both((l) => http(l).get('/user-progress/my').query(query))
    }).toMatchSnapshot()
  })

  it('user-history: exercises, tests, recent exercises', async () => {
    const page = { currentPage: '1', pageSize: '10' }
    expect({
      historyExercises: capture(
        await http().get('/user-history/history-exercises').query(page)
      ),
      historyTests: capture(await http().get('/user-history/history-tests').query(page)),
      recentExercises: capture(
        await http().get('/user-history/recent-exercises').query(page)
      )
    }).toMatchSnapshot()
  })

  it('errors: bad query values', async () => {
    expect({
      progressBadPageSize: await both((l) =>
        http(l).get('/user-progress/my').query({ pageSize: 'abc' })
      ),
      progressBadCategory: await both((l) =>
        http(l).get('/user-progress/my').query({ lessonCategoryId: 'abc' })
      ),
      progressUnknownField: await both((l) =>
        http(l).get('/user-progress/my').query({ search: 'x' })
      ),
      historyBadPageSize: await both((l) =>
        http(l).get('/user-history/history-exercises').query({ pageSize: 'abc' })
      ),
      testsBadPage: await both((l) =>
        http(l).get('/user-history/history-tests').query({ currentPage: '0' })
      )
    }).toMatchSnapshot()
  })
})
