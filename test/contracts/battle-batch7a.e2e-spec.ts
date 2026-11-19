import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 7a baseline (group 5, battle): leaderboard-season,
// season-rank-reward, user-season-history. The mobile app reads the current
// season and its rewards, the rank list, joins the season and claims a past
// season's reward (src/services/leaderboard, user-season-history); the web
// admin lists, creates, edits and deletes seasons and sets their rank rewards.
// Seasons, a reward and season histories are made here and removed after (the
// test database has no season of its own). Errors in vi and en.
describe('Battle batch 7a contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let userId: number
  let rewardId = 0
  const startedAt = new Date()
  const seasons: number[] = []
  const languages: number[] = []
  let walletsBefore: { id: number; balance: number }[] = []

  const anon = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
  const http = (lang = 'vi') => anon(lang).auth(token, { type: 'bearer' })
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
  const day = 24 * 60 * 60 * 1000
  // A season made directly (the API would refuse an ACTIVE/EXPIRED one in the past)
  const season = async (status: 'ACTIVE' | 'EXPIRED', from: number, to: number) => {
    const s = await prisma.leaderboardSeason.create({
      data: {
        nameKey: `leaderboardSeason.contract7a.${status}.${Date.now()}`,
        status,
        hasOpened: true,
        startDate: new Date(Date.now() + from * day),
        endDate: new Date(Date.now() + to * day)
      }
    })
    seasons.push(s.id)
    return s
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
      languages.push((await prisma.languages.create({ data: { code, name } })).id)
    }
    token = await loginAsTestAdmin(app, [
      { method: 'GET', path: '/leaderboard-season' },
      { method: 'GET', path: '/leaderboard-season/rank-list' },
      { method: 'GET', path: '/leaderboard-season/reward-now' },
      { method: 'GET', path: '/leaderboard-season/:leaderboardSeasonId' },
      { method: 'POST', path: '/leaderboard-season' },
      { method: 'PUT', path: '/leaderboard-season/:leaderboardSeasonId' },
      { method: 'DELETE', path: '/leaderboard-season/:leaderboardSeasonId' },
      { method: 'PUT', path: '/season-rank-reward/list' },
      { method: 'GET', path: '/user-season-history/user' },
      { method: 'POST', path: '/user-season-history/join' },
      { method: 'PUT', path: '/user-season-history/get-reward/:userSeasonHistoryId' }
    ])
    userId = (await prisma.user.findUniqueOrThrow({ where: { email: TEST_ADMIN.email } }))
      .id
    walletsBefore = await prisma.wallet.findMany({
      where: { userId },
      select: { id: true, balance: true }
    })
    // the claimed reward is sparkles: a user without that wallet gets nothing
    // (silently, see tracker), so the normal path needs the wallet
    await prisma.wallet.upsert({
      where: { userId_type: { userId, type: 'SPARKLES' } },
      create: { userId, type: 'SPARKLES' },
      update: {}
    })
    rewardId = (
      await prisma.reward.create({
        data: {
          nameKey: `reward.contract7a.${Date.now()}`,
          rewardType: 'EVENT',
          rewardItem: 7,
          rewardTarget: 'SPARKLES'
        }
      })
    ).id
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.userSeasonHistory.deleteMany({ where: { seasonId: { in: seasons } } })
      await prisma.seasonRankReward.deleteMany({ where: { seasonId: { in: seasons } } })
      await prisma.translation.deleteMany({
        where: { key: { startsWith: 'leaderboardSeason.' }, value: { startsWith: 'Contract 7a' } }
      })
      await prisma.leaderboardSeason.deleteMany({ where: { id: { in: seasons } } })
      // what claiming the reward wrote
      await prisma.userRewardHistory.deleteMany({
        where: { userId, createdAt: { gte: startedAt } }
      })
      await prisma.walletTransaction.deleteMany({
        where: { userId, createdAt: { gte: startedAt } }
      })
      const kept = walletsBefore.map((w) => w.id)
      await prisma.wallet.deleteMany({ where: { userId, id: { notIn: kept } } })
      for (const w of walletsBefore) {
        await prisma.wallet.update({ where: { id: w.id }, data: { balance: w.balance } })
      }
      await prisma.reward.deleteMany({ where: { id: rewardId } })
      await prisma.languages.deleteMany({ where: { id: { in: languages } } })
    }
    await app?.close()
  })

  it('mobile, no season running: reward-now, join, my history', async () => {
    expect({
      rewardNow: await both((l) => http(l).get('/leaderboard-season/reward-now')),
      join: await both((l) => http(l).post('/user-season-history/join')),
      myHistory: capture(await http().get('/user-season-history/user'))
    }).toMatchSnapshot()
  })

  it('web: season create, list, read, update, rank rewards, delete', async () => {
    const created = await http()
      .post('/leaderboard-season')
      .send({
        status: 'PREVIEW',
        startDate: new Date(Date.now() + 30 * day).toISOString(),
        endDate: new Date(Date.now() + 60 * day).toISOString(),
        nameTranslations: [
          { key: 'vi', value: 'Contract 7a mùa' },
          { key: 'en', value: 'Contract 7a season' }
        ]
      })
    const id = created.body.data?.id ?? 0
    if (id) seasons.push(id)
    expect({
      created: capture(created),
      list: capture(
        await http().get('/leaderboard-season').query({ currentPage: 1, pageSize: 5 })
      ),
      one: capture(await http().get(`/leaderboard-season/${id}`)),
      updated: capture(
        await http()
          .put(`/leaderboard-season/${id}`)
          .send({
            nameTranslations: [
              { key: 'vi', value: 'Contract 7a mùa 2' },
              { key: 'en', value: 'Contract 7a season 2' }
            ]
          })
      ),
      rankRewards: capture(
        await http()
          .put('/season-rank-reward/list')
          .send({
            seasonId: id,
            items: [
              { rankName: 'N5', infoOrders: [{ order: 1, rewards: [rewardId] }] },
              { rankName: 'N4', infoOrders: [{ order: null, rewards: [] }] }
            ]
          })
      ),
      deleted: capture(await http().delete(`/leaderboard-season/${id}`))
    }).toMatchSnapshot()
  })

  it('mobile, a season running: reward-now, join, my history, rank list', async () => {
    await season('ACTIVE', -1, 10)
    expect({
      rewardNow: capture(await http().get('/leaderboard-season/reward-now')),
      join: capture(await http().post('/user-season-history/join')),
      myHistory: capture(await http().get('/user-season-history/user')),
      rankList: capture(
        await http()
          .get('/leaderboard-season/rank-list')
          .query({ currentPage: 1, pageSize: 5 })
      ),
      rankListN5: capture(
        await http()
          .get('/leaderboard-season/rank-list')
          .query({ currentPage: 1, pageSize: 5, rankName: 'N5' })
      )
    }).toMatchSnapshot()
  })

  it("mobile: a past season's rank list and reward claim (once)", async () => {
    const past = await season('EXPIRED', -40, -20)
    const rankReward = await prisma.seasonRankReward.create({
      data: {
        seasonId: past.id,
        rankName: 'N5',
        order: 1,
        rewards: { connect: [{ id: rewardId }] }
      }
    })
    const history = await prisma.userSeasonHistory.create({
      data: {
        userId,
        seasonId: past.id,
        finalElo: 120,
        finalRank: 'N5',
        seasonRankRewardId: rankReward.id,
        rewardsClaimed: 'CLAIMED'
      }
    })
    // one history per user and season: the not-finalized one is another season's
    const older = await season('EXPIRED', -80, -60)
    const pending = await prisma.userSeasonHistory.create({
      data: { userId, seasonId: older.id, finalElo: 80, finalRank: 'N5' }
    })
    expect({
      rankList: capture(
        await http()
          .get('/leaderboard-season/rank-list')
          .query({ currentPage: 1, pageSize: 5, leaderboardSeasonId: past.id })
      ),
      claim: capture(await http().put(`/user-season-history/get-reward/${history.id}`)),
      claimAgain: await both((l) =>
        http(l).put(`/user-season-history/get-reward/${history.id}`)
      ),
      claimNotFinalized: await both((l) =>
        http(l).put(`/user-season-history/get-reward/${pending.id}`)
      )
    }).toMatchSnapshot()
  })

  it('errors', async () => {
    expect({
      seasonBadId: await both((l) => http(l).get('/leaderboard-season/abc')),
      seasonMissing: await both((l) => http(l).get('/leaderboard-season/99999999')),
      seasonCreateEmpty: await both((l) => http(l).post('/leaderboard-season').send({})),
      seasonDeleteMissing: await both((l) => http(l).delete('/leaderboard-season/99999999')),
      rankRewardsMissingSeason: await both((l) =>
        http(l)
          .put('/season-rank-reward/list')
          .send({ seasonId: 99999999, items: [] })
      ),
      claimBadId: await both((l) => http(l).put('/user-season-history/get-reward/abc')),
      claimMissing: await both((l) =>
        http(l).put('/user-season-history/get-reward/99999999')
      ),
      rankListWithoutLogin: {
        httpStatus: (await anon().get('/leaderboard-season/rank-list')).status
      }
    }).toMatchSnapshot()
  })
})
