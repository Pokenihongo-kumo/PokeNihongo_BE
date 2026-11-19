import { AppModule } from '@/app.module'
import { RewardService } from '@/modules/reward/reward.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { App } from 'supertest/types'
import { TEST_ADMIN } from '../support/test-admin'

// Every reward source (season, achievement, exercise, test) pays through
// RewardService.convertRewardsWithUser. A user without a wallet of the reward's
// type used to get nothing while the claim still succeeded; the wallet is now
// created with the reward, and the ledger row written with it.
describe('Reward payout without a wallet (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let rewards: RewardService
  const tag = `reward-wallet-${Date.now()}`
  const users: number[] = []
  const rewardIds: number[] = []

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    rewards = app.get(RewardService)
  })

  afterAll(async () => {
    if (prisma) {
      // wallets, ledger rows, reward history and notifications go with the user
      await prisma.user.deleteMany({ where: { id: { in: users } } })
      await prisma.reward.deleteMany({ where: { id: { in: rewardIds } } })
    }
    await app?.close()
  })

  it('creates the missing SPARKLES and POKE_COINS wallets with the reward', async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_ADMIN.email }
    })
    const user = await prisma.user.create({
      data: {
        email: `${tag}@example.test`,
        password: 'x',
        name: tag,
        roleId: admin.roleId,
        levelId: admin.levelId,
        status: 'ACTIVE'
      }
    })
    users.push(user.id)
    for (const [rewardTarget, rewardItem] of [
      ['SPARKLES', 5],
      ['POKE_COINS', 3]
    ] as const) {
      const r = await prisma.reward.create({
        data: {
          nameKey: `reward.${tag}.${rewardTarget}`,
          rewardType: 'EVENT',
          rewardItem,
          rewardTarget
        }
      })
      rewardIds.push(r.id)
    }
    expect(await prisma.wallet.count({ where: { userId: user.id } })).toBe(0)

    await rewards.convertRewardsWithUser(rewardIds, user.id, 'SEASON_REWARD', {}, 42)

    // sorted here: Postgres orders an enum by declaration, not by name
    const wallets = (await prisma.wallet.findMany({ where: { userId: user.id } })).sort(
      (x, y) => x.type.localeCompare(y.type)
    )
    expect(wallets.map(({ type, balance }) => ({ type, balance }))).toEqual([
      { type: 'POKE_COINS', balance: 3 },
      { type: 'SPARKLES', balance: 5 }
    ])
    const ledger = await prisma.walletTransaction.findMany({
      where: { userId: user.id },
      orderBy: { amount: 'asc' }
    })
    expect(
      ledger.map(({ walletId, amount, type, purpose, source, referenceId }) => ({
        walletId,
        amount,
        type,
        purpose,
        source,
        referenceId
      }))
    ).toEqual([
      {
        walletId: wallets[0].id,
        amount: 3,
        type: 'INCREASE',
        purpose: 'REWARD',
        source: 'RANK_REWARD',
        referenceId: 42
      },
      {
        walletId: wallets[1].id,
        amount: 5,
        type: 'INCREASE',
        purpose: 'REWARD',
        source: 'RANK_REWARD',
        referenceId: 42
      }
    ])
  })
})
