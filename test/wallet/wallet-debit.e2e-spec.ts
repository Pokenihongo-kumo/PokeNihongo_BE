import { AppModule } from '@/app.module'
import { walletType } from '@/common/constants/wallet.constant'
import { WalletRepo } from '@/modules/wallet/wallet.repo'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PrismaClient } from '@prisma/client'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_ADMIN } from '../support/test-admin'

// Wallet debit (A1 T7). Shop, gacha and the subscription discount check the
// balance before their transaction, then debit inside it. The debit itself
// must refuse to go below zero: of concurrent purchases that the balance pays
// for once, only one is charged; the others get null and roll back.
describe('Wallet debit (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let repo: WalletRepo
  let userId: number
  let walletId: number
  let originalBalance: number | null = null

  const setBalance = (balance: number) =>
    prisma.wallet.update({ where: { id: walletId }, data: { balance } })
  const balance = async () =>
    (await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } })).balance
  // As the purchase flows do: debit inside a transaction, roll back on null
  const purchase = (amount: number) =>
    repo
      .withTransaction(async (tx: PrismaClient) => {
        const wallet = await repo.minusBalanceToWalletWithTypeUserId(
          { userId, type: walletType.SPARKLES, amount },
          tx
        )
        if (!wallet) throw new Error('not enough balance')
        return wallet.balance
      })
      .then(
        (left) => ({ charged: true, left }),
        () => ({ charged: false })
      )

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    repo = app.get(WalletRepo)
    await loginAsTestAdmin(app, [])
    userId = (await prisma.user.findFirstOrThrow({ where: { email: TEST_ADMIN.email } }))
      .id
    const existing = await prisma.wallet.findUnique({
      where: { userId_type: { userId, type: walletType.SPARKLES } }
    })
    originalBalance = existing?.balance ?? null
    walletId = (
      existing ??
      (await prisma.wallet.create({ data: { userId, type: walletType.SPARKLES } }))
    ).id
  })

  afterAll(async () => {
    if (walletId) {
      if (originalBalance === null)
        await prisma.wallet.delete({ where: { id: walletId } })
      else await setBalance(originalBalance)
    }
    await app?.close()
  })

  it('five purchases at once that the balance pays for once: one is charged, the balance stays at 0', async () => {
    await setBalance(100)
    const results = await Promise.all(Array.from({ length: 5 }, () => purchase(100)))
    expect(results.filter((r) => r.charged)).toEqual([{ charged: true, left: 0 }])
    expect(await balance()).toBe(0)
  })

  it('a debit larger than the balance is refused and changes nothing', async () => {
    await setBalance(50)
    expect(await purchase(80)).toEqual({ charged: false })
    expect(await balance()).toBe(50)
  })

  it('an exact debit is allowed', async () => {
    await setBalance(80)
    expect(await purchase(80)).toEqual({ charged: true, left: 0 })
  })
})
