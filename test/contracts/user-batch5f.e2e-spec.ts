import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 5f baseline: achievement, user-achievement, daily-request,
// user-daily-request. The mobile app reads its achievements and claims a
// reward (src/services/achievement); the web admin manages daily requests
// (src/services/dailyRequest: list with qs, create, update, delete). The daily
// request made here is inactive and deleted again. Errors in vi and en.
describe('User batch 5f contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let dailyRequestId = 0
  const languages: number[] = []

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
      languages.push((await prisma.languages.create({ data: { code, name } })).id)
    }
    token = await loginAsTestAdmin(app, [
      { method: 'GET', path: '/user-achievement/user' },
      { method: 'PUT', path: '/user-achievement/get-reward/:userAchievementId' },
      { method: 'GET', path: '/achievement/:achievementId' },
      { method: 'GET', path: '/daily-request' },
      { method: 'POST', path: '/daily-request' },
      { method: 'GET', path: '/daily-request/:dailyRequestId' },
      { method: 'PUT', path: '/daily-request/:dailyRequestId' },
      { method: 'DELETE', path: '/daily-request/:dailyRequestId' },
      { method: 'GET', path: '/user-daily-request/:userDailyRequestId' }
    ])
  })

  afterAll(async () => {
    if (prisma && dailyRequestId) {
      await prisma.dailyRequest.deleteMany({ where: { id: dailyRequestId } })
    }
    await prisma?.languages.deleteMany({ where: { id: { in: languages } } })
    await app?.close()
  })

  it('achievements of the app user (as achievements.tsx asks)', async () => {
    expect({
      mine: capture(
        await http()
          .get('/user-achievement/user')
          .query({
            qs: 'sort:id',
            currentPage: '1',
            achPageSize: '3',
            achCurrentPage: '1'
          })
      )
    }).toMatchSnapshot()
  })

  it('daily requests of the web admin: create, list, detail, update, delete', async () => {
    const stamp = Date.now()
    const create = await http()
      .post('/daily-request')
      .send({
        dailyRequestType: 'DAILY_LOGIN',
        conditionValue: 1,
        isActive: false,
        isStreak: false,
        nameTranslations: [
          { key: 'vi', value: `Hợp đồng 5f ${stamp}` },
          { key: 'en', value: `Contract 5f ${stamp}` }
        ],
        descriptionTranslations: [
          { key: 'vi', value: `Mô tả 5f ${stamp}` },
          { key: 'en', value: `Description 5f ${stamp}` }
        ]
      })
    dailyRequestId = create.body.data?.id ?? 0
    expect({
      create: capture(create),
      list: capture(
        await http()
          .get('/daily-request')
          .query({ qs: 'sort:-id', currentPage: '1', pageSize: '10' })
      ),
      detail: capture(await http().get(`/daily-request/${dailyRequestId}`)),
      update: capture(
        await http().put(`/daily-request/${dailyRequestId}`).send({ conditionValue: 2 })
      ),
      remove: capture(await http().delete(`/daily-request/${dailyRequestId}`))
    }).toMatchSnapshot()
  })

  it('errors', async () => {
    expect({
      rewardMissing: await both((l) =>
        http(l).put('/user-achievement/get-reward/999999')
      ),
      rewardInvalidId: await both((l) => http(l).put('/user-achievement/get-reward/abc')),
      mineBadAchPageSize: await both((l) =>
        http(l).get('/user-achievement/user').query({ achPageSize: 'abc' })
      ),
      mineBadGroup: await both((l) =>
        http(l).get('/user-achievement/user').query({ achievementGroupId: 'abc' })
      ),
      achievementMissing: await both((l) => http(l).get('/achievement/999999')),
      dailyMissing: await both((l) => http(l).get('/daily-request/999999')),
      dailyInvalidId: await both((l) => http(l).get('/daily-request/abc')),
      dailyCreateInvalid: await both((l) =>
        http(l).post('/daily-request').send({ conditionValue: 0 })
      ),
      dailyUpdateMissing: await both((l) =>
        http(l).put('/daily-request/999999').send({ conditionValue: 2 })
      ),
      dailyDeleteMissing: await both((l) => http(l).delete('/daily-request/999999')),
      userDailyMissing: await both((l) => http(l).get('/user-daily-request/999999'))
    }).toMatchSnapshot()
  })
})
