import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 6a baseline (group 4, economy): wallet, wallet-transaction,
// reward, user-reward-history. The mobile app reads the user's wallets
// (src/services/wallet) and reward history (src/services/reward); the web admin
// lists and edits rewards (src/services/reward). wallet-transaction has no
// client. A reward and a history row are made here and removed after. Errors
// in vi and en.
describe('Economy batch 6a contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let userId: number
  let rewardId = 0
  let historyId = 0
  const languages: number[] = []

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
      { method: 'GET', path: '/wallet/user' },
      { method: 'GET', path: '/wallet/:walletId' },
      { method: 'GET', path: '/wallet-transaction' },
      { method: 'GET', path: '/wallet-transaction/:walletTransactionId' },
      { method: 'GET', path: '/reward' },
      { method: 'GET', path: '/reward/admin' },
      { method: 'GET', path: '/reward/admin/:rewardId' },
      { method: 'GET', path: '/reward/:rewardId' },
      { method: 'POST', path: '/reward' },
      { method: 'PUT', path: '/reward/:rewardId' },
      { method: 'DELETE', path: '/reward/:rewardId' },
      { method: 'GET', path: '/user-reward-history/my' },
      { method: 'GET', path: '/user-reward-history/:id' }
    ])
    userId = (await prisma.user.findUniqueOrThrow({ where: { email: TEST_ADMIN.email } }))
      .id
    historyId = (
      await prisma.userRewardHistory.create({
        data: {
          userId,
          rewardTargetSnapshot: 'SPARKLES',
          amount: 10,
          sourceType: 'ADMIN_ADJUST',
          note: 'contract 6a'
        }
      })
    ).id
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.userRewardHistory.deleteMany({ where: { id: historyId } })
      if (rewardId) {
        await prisma.translation.deleteMany({
          where: { key: { startsWith: 'reward.' }, value: { startsWith: 'Contract 6a' } }
        })
        await prisma.reward.deleteMany({ where: { id: rewardId } })
      }
      await prisma.languages.deleteMany({ where: { id: { in: languages } } })
    }
    await app?.close()
  })

  it('mobile: my wallets and my reward history', async () => {
    expect({
      wallets: capture(await http().get('/wallet/user')),
      history: capture(
        await http().get('/user-reward-history/my').query({ currentPage: 1, pageSize: 5 })
      ),
      historyFiltered: capture(
        await http()
          .get('/user-reward-history/my')
          .query({ currentPage: 1, pageSize: 5, sourceType: 'ADMIN_ADJUST' })
      )
    }).toMatchSnapshot()
  })

  it('web: reward list, create, read, update, delete', async () => {
    const created = await http()
      .post('/reward')
      .send({
        rewardType: 'LESSON',
        rewardItem: 5,
        rewardTarget: 'EXP',
        nameTranslations: [
          { key: 'vi', value: 'Contract 6a thưởng' },
          { key: 'en', value: 'Contract 6a reward' }
        ]
      })
    rewardId = created.body.data?.id ?? 0
    expect({
      created: capture(created),
      list: capture(await http().get('/reward').query({ currentPage: 1, pageSize: 5 })),
      adminList: capture(
        await http().get('/reward/admin').query({ currentPage: 1, pageSize: 5 })
      ),
      adminOne: capture(await http().get(`/reward/admin/${rewardId}`)),
      one: capture(await http().get(`/reward/${rewardId}`)),
      updated: capture(
        await http()
          .put(`/reward/${rewardId}`)
          .send({
            rewardItem: 6,
            nameTranslations: [
              { key: 'vi', value: 'Contract 6a thưởng 2' },
              { key: 'en', value: 'Contract 6a reward 2' }
            ]
          })
      ),
      deleted: capture(await http().delete(`/reward/${rewardId}`))
    }).toMatchSnapshot()
  })

  it('errors', async () => {
    expect({
      rewardBadId: await both((l) => http(l).get('/reward/abc')),
      rewardMissing: await both((l) => http(l).get('/reward/99999999')),
      rewardCreateEmpty: await both((l) => http(l).post('/reward').send({})),
      walletBadId: await both((l) => http(l).get('/wallet/abc')),
      walletMissing: await both((l) => http(l).get('/wallet/99999999')),
      historyBadId: await both((l) => http(l).get('/user-reward-history/abc')),
      historyMissing: await both((l) => http(l).get('/user-reward-history/99999999')),
      historyBadSource: await both((l) =>
        http(l).get('/user-reward-history/my').query({ sourceType: 'NOPE' })
      ),
      transactionsWithoutLogin: {
        httpStatus: (await anon().get('/wallet-transaction')).status
      },
      transactionWithoutLogin: {
        httpStatus: (await anon().get('/wallet-transaction/1')).status
      }
    }).toMatchSnapshot()
  })
})
