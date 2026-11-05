import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Reward create/delete must be all-or-nothing (plan phase 1, items 2-3).
// The second DELETE of a reward is a hard delete of the reward and its name
// translations; it can fail on the Restrict foreign key from UserRewardHistory.
describe('Reward create/delete transactions (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let adminId: number
  const createdLanguageCodes: string[] = []
  const createdRewardIds: number[] = []

  const http = () =>
    request.agent(app.getHttpServer()).set('User-Agent', TEST_USER_AGENT).auth(token, {
      type: 'bearer'
    })

  const createReward = (nameTranslations: { key: string; value: string }[]) =>
    http().post('/reward').send({
      rewardType: 'EVENT',
      rewardItem: 10,
      rewardTarget: 'EXP',
      nameTranslations
    })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()

    prisma = app.get(PrismaService)
    if (!(await prisma.languages.findUnique({ where: { code: 'vi' } }))) {
      await prisma.languages.create({ data: { code: 'vi', name: 'Tiếng Việt' } })
      createdLanguageCodes.push('vi')
    }
    token = await loginAsTestAdmin(app, [
      { method: 'POST', path: '/reward' },
      { method: 'DELETE', path: '/reward/:rewardId' }
    ])
    adminId = (await prisma.user.findFirstOrThrow({ where: { email: TEST_ADMIN.email } }))
      .id
  })

  // Leave the test DB as it was
  afterAll(async () => {
    if (prisma) {
      await prisma.userRewardHistory.deleteMany({
        where: { rewardId: { in: createdRewardIds } }
      })
      const rewards = await prisma.reward.findMany({
        where: { id: { in: createdRewardIds } }
      })
      await prisma.translation.deleteMany({
        where: { key: { in: rewards.map((r) => r.nameKey) } }
      })
      await prisma.reward.deleteMany({ where: { id: { in: createdRewardIds } } })
      await prisma.languages.deleteMany({ where: { code: { in: createdLanguageCodes } } })
    }
    await app?.close()
  })

  it('a failed hard delete keeps both the reward and its name translations', async () => {
    const created = await createReward([{ key: 'vi', value: `Thưởng thử ${Date.now()}` }])
    expect(created.status).toBe(201)
    const reward = created.body.data
    createdRewardIds.push(reward.id)
    const translationsOf = () =>
      prisma.translation.count({ where: { key: reward.nameKey } })
    expect(await translationsOf()).toBe(1)

    // First delete is soft
    expect((await http().delete(`/reward/${reward.id}`)).status).toBe(200)

    // A history row pins the reward (onDelete: Restrict), so the hard delete fails
    await prisma.userRewardHistory.create({
      data: { userId: adminId, rewardId: reward.id, sourceType: 'OTHER', amount: 10 }
    })
    const failed = await http().delete(`/reward/${reward.id}`)

    expect(failed.status).toBe(409)
    expect(await prisma.reward.findUnique({ where: { id: reward.id } })).not.toBeNull()
    expect(await translationsOf()).toBe(1)

    // Once nothing references it, the hard delete removes both
    await prisma.userRewardHistory.deleteMany({ where: { rewardId: reward.id } })
    expect((await http().delete(`/reward/${reward.id}`)).status).toBe(200)
    expect(await prisma.reward.findUnique({ where: { id: reward.id } })).toBeNull()
    expect(await translationsOf()).toBe(0)
  })

  it('a create that fails after inserting the reward leaves no row behind', async () => {
    const before = await prisma.reward.count()

    // "zz" is not a language: rejected after the reward row was inserted in the transaction
    const res = await createReward([{ key: 'zz', value: 'không có ngôn ngữ' }])

    expect(res.status).toBe(422)
    expect(await prisma.reward.count()).toBe(before)
  })
})
