import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 5g baseline: user-pokemon, notification, dashboard. The mobile
// app lists the user's Pokemon (src/services/user-pokemon, battle) and reads
// its notifications (src/services/notification); the web admin reads the
// dashboard (src/services/dashboard). A notification is made here for the
// test user. Dashboard numbers move with the data other specs make, so only
// the status, message and the keys of data are kept. Errors in vi and en.
describe('User batch 5g contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let userId: number
  let notificationId = 0
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
  const brief = (res: request.Response) => {
    const data = res.body?.data
    return {
      httpStatus: res.status,
      message: res.body?.message,
      data:
        data && typeof data === 'object' && !Array.isArray(data)
          ? Object.keys(data).sort()
          : Array.isArray(data)
            ? 'array'
            : typeof data
    }
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
    const dashboard = [
      'subscription-stats',
      'subscription-stats/revennue',
      'user-growth/jlpt-distribution',
      'user-growth/account-activation',
      'user-growth/active-users',
      'user-growth/new-users',
      'user-growth/total-users',
      'engagement/popular-content',
      'engagement/sparkles-accumulation',
      'engagement/battle-activity',
      'engagement/starter-pokemon-distribution',
      'engagement/streak-retention',
      'content-performance/completion-rate',
      'leaderboard-season/overview',
      'leaderboard-season/:seasonId',
      'gacha-stats/overview',
      'gacha-stats/:gachaBannerId'
    ].map((path) => ({ method: 'GET' as const, path: `/dashboard/${path}` }))
    token = await loginAsTestAdmin(app, [
      { method: 'GET', path: '/user-pokemon' },
      { method: 'POST', path: '/user-pokemon' },
      { method: 'GET', path: '/user-pokemon/user/pokemons' },
      { method: 'GET', path: '/user-pokemon/user/pokemons/stats' },
      { method: 'GET', path: '/user-pokemon/user/rounds/pokemons' },
      { method: 'GET', path: '/user-pokemon/evolves/:pokemonId' },
      { method: 'GET', path: '/notification/user' },
      { method: 'PUT', path: '/notification/read/:notificationId' },
      { method: 'PUT', path: '/notification/read/list' },
      ...dashboard
    ])
    userId = (await prisma.user.findUniqueOrThrow({ where: { email: TEST_ADMIN.email } }))
      .id
    notificationId = (
      await prisma.notification.create({
        data: { userId, titleKey: 'contract.5g.title', bodyKey: 'contract.5g.body' }
      })
    ).id
  })

  afterAll(async () => {
    if (prisma && notificationId) {
      await prisma.notification.deleteMany({ where: { id: notificationId } })
    }
    await prisma?.languages.deleteMany({ where: { id: { in: languages } } })
    await app?.close()
  })

  it('user-pokemon: the lists and stats the app asks for', async () => {
    expect({
      list: capture(await http().get('/user-pokemon')),
      mine: capture(
        await http()
          .get('/user-pokemon/user/pokemons')
          .query({ currentPage: '1', pageSize: '10', hasPokemon: 'true', qs: 'sort:id' })
      ),
      stats: capture(await http().get('/user-pokemon/user/pokemons/stats')),
      rounds: capture(
        await http().get('/user-pokemon/user/rounds/pokemons').query({ qs: 'types=1' })
      )
    }).toMatchSnapshot()
  })

  it('notification: list, read one, read a list', async () => {
    expect({
      list: capture(
        await http().get('/notification/user').query({ currentPage: '1', pageSize: '10' })
      ),
      readOne: capture(await http().put(`/notification/read/${notificationId}`)),
      readList: capture(
        await http()
          .put('/notification/read/list')
          .send({ notificationIds: [notificationId] })
      )
    }).toMatchSnapshot()
  })

  it('dashboard: the web admin routes', async () => {
    const get = async (path: string, query: Record<string, string> = {}) =>
      brief(await http().get(`/dashboard/${path}`).query(query))
    expect({
      subscriptionStats: await get('subscription-stats'),
      revenue: await get('subscription-stats/revennue', { month: '1', year: '2026' }),
      jlptDistribution: await get('user-growth/jlpt-distribution'),
      accountActivation: await get('user-growth/account-activation'),
      activeUsers: await get('user-growth/active-users', { period: 'week' }),
      newUsers: await get('user-growth/new-users', { period: 'month' }),
      totalUsers: await get('user-growth/total-users'),
      popularContent: await get('engagement/popular-content'),
      sparkles: await get('engagement/sparkles-accumulation'),
      battleActivity: await get('engagement/battle-activity'),
      starterPokemon: await get('engagement/starter-pokemon-distribution'),
      streakRetention: await get('engagement/streak-retention'),
      completionRate: await get('content-performance/completion-rate'),
      seasonOverview: await get('leaderboard-season/overview'),
      gachaOverview: await get('gacha-stats/overview')
    }).toMatchSnapshot()
  })

  it('errors', async () => {
    expect({
      evolvesMissing: await both((l) => http(l).get('/user-pokemon/evolves/999999')),
      evolvesInvalidId: await both((l) => http(l).get('/user-pokemon/evolves/abc')),
      createInvalidBody: await both((l) => http(l).post('/user-pokemon').send({})),
      mineBadHasPokemon: await both((l) =>
        http(l).get('/user-pokemon/user/pokemons').query({ hasPokemon: 'maybe' })
      ),
      readMissing: await both((l) => http(l).put('/notification/read/999999')),
      readInvalidId: await both((l) => http(l).put('/notification/read/abc')),
      readListEmpty: await both((l) =>
        http(l).put('/notification/read/list').send({ notificationIds: [] })
      ),
      seasonInvalidId: await both((l) =>
        http(l).get('/dashboard/leaderboard-season/abc')
      ),
      seasonMissing: await both((l) =>
        http(l).get('/dashboard/leaderboard-season/999999')
      ),
      gachaInvalidId: await both((l) => http(l).get('/dashboard/gacha-stats/abc')),
      gachaMissing: await both((l) => http(l).get('/dashboard/gacha-stats/999999')),
      newUsersBadPeriod: await both((l) =>
        http(l).get('/dashboard/user-growth/new-users').query({ period: 'decade' })
      ),
      revenueBadMonth: await both((l) =>
        http(l).get('/dashboard/subscription-stats/revennue').query({ month: 'abc' })
      )
    }).toMatchSnapshot()
  })
})
