import { AppModule } from '@/app.module'
import { walletType } from '@/common/constants/wallet.constant'
import { PayOSService } from '@/shared/services/payos.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// POST /invoice (mobile subscription screen), batch 6d. PokeCoin may pay at
// most half the plan price (GET /subscription-plan/discount/:id says so, and
// the app caps it), but the invoice took any discount: 90% off, or the whole
// price. One pending invoice per plan and user. PayOS is faked.
describe('Invoice create (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let userId: number
  let walletId: number
  let originalCoins: number | null = null
  const stamp = Date.now()
  const created = { subscription: 0, plans: [] as number[] }
  const PRICE = 100000

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
      .auth(token, { type: 'bearer' })
  const order = (subscriptionPlanId: number, discountAmount: number, lang = 'vi') =>
    http(lang).post('/invoice').send({ subscriptionPlanId, discountAmount })
  const coins = async () =>
    (await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } })).balance
  const newPlan = async () => {
    const plan = await prisma.subscriptionPlan.create({
      data: {
        subscriptionId: created.subscription,
        price: PRICE,
        type: 'LIFETIME',
        isActive: true
      }
    })
    created.plans.push(plan.id)
    return plan.id
  }
  const invoicesOf = (subscriptionPlanId: number) =>
    prisma.invoice.findMany({ where: { userId, subscriptionPlanId } })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)
    token = await loginAsTestAdmin(app, [{ method: 'POST', path: '/invoice' }])
    userId = (await prisma.user.findUniqueOrThrow({ where: { email: TEST_ADMIN.email } }))
      .id
    const wallet = await prisma.wallet.findUnique({
      where: { userId_type: { userId, type: walletType.POKE_COINS } }
    })
    originalCoins = wallet?.balance ?? null
    walletId = (
      wallet ??
      (await prisma.wallet.create({ data: { userId, type: walletType.POKE_COINS } }))
    ).id
    await prisma.wallet.update({ where: { id: walletId }, data: { balance: PRICE * 10 } })
    created.subscription = (
      await prisma.subscription.create({
        data: {
          nameKey: `subscription.invoice${stamp}.name`,
          descriptionKey: `subscription.invoice${stamp}.desc`
        }
      })
    ).id
    jest.spyOn(PayOSService.prototype, 'createPaymentLink').mockImplementation(
      async (req: { orderCode: number; amount: number }) =>
        ({
          orderCode: req.orderCode,
          checkoutUrl: `https://pay.example.test/${req.orderCode}`,
          qrCode: 'qr',
          paymentLinkId: `link-${req.orderCode}`,
          expiredAt: Math.floor(Date.now() / 1000) + 900,
          amount: req.amount
        }) as never
    )
  })

  afterAll(async () => {
    jest.restoreAllMocks()
    if (prisma) {
      const invoices = await prisma.invoice.findMany({
        where: { subscriptionPlanId: { in: created.plans } },
        select: { id: true }
      })
      const ids = invoices.map((i) => i.id)
      await prisma.walletTransaction.deleteMany({
        where: { userId, referenceId: { in: ids }, purpose: 'SUBSCRIPTION' }
      })
      await prisma.invoice.updateMany({
        where: { id: { in: ids } },
        data: { walletTransactionId: null }
      })
      await prisma.userSubscription.deleteMany({ where: { invoiceId: { in: ids } } })
      await prisma.payment.deleteMany({ where: { invoiceId: { in: ids } } })
      await prisma.invoice.deleteMany({ where: { id: { in: ids } } })
      await prisma.subscriptionPlan.deleteMany({ where: { id: { in: created.plans } } })
      await prisma.subscription.deleteMany({ where: { id: created.subscription } })
      if (originalCoins === null) await prisma.wallet.delete({ where: { id: walletId } })
      else
        await prisma.wallet.update({
          where: { id: walletId },
          data: { balance: originalCoins }
        })
    }
    await app?.close()
  })

  it('half the price in PokeCoin is accepted', async () => {
    const planId = await newPlan()
    const before = await coins()
    const res = await order(planId, PRICE / 2)
    expect(res.status).toBe(201)
    expect(res.body.data.invoice).toMatchObject({
      subtotalAmount: PRICE,
      discountAmount: PRICE / 2,
      totalAmount: PRICE / 2
    })
    expect(await coins()).toBe(before - PRICE / 2)
  })

  it('more than half, the whole price, or a fraction is refused, and no coin is taken', async () => {
    const before = await coins()
    const results: { status: number; invoices: number }[] = []
    // a plan each, so a pending invoice of one case does not hide the next
    for (const discount of [PRICE / 2 + 1, PRICE * 0.9, PRICE, PRICE * 2, 10.5]) {
      const planId = await newPlan()
      const status = (await order(planId, discount)).status
      results.push({ status, invoices: (await invoicesOf(planId)).length })
    }
    expect(results).toEqual(Array(5).fill({ status: 422, invoices: 0 }))
    expect(await coins()).toBe(before)
  })

  it('two orders of one plan at once: one pending invoice', async () => {
    const planId = await newPlan()
    const statuses = (await Promise.all([order(planId, 0), order(planId, 0)])).map(
      (res) => res.status
    )
    expect(statuses.filter((s) => s === 201)).toHaveLength(1)
    expect(await invoicesOf(planId)).toHaveLength(1)
  })

  it('the refusal says why, in the asked language', async () => {
    const planId = await newPlan()
    const [vi, en] = [await order(planId, PRICE, 'vi'), await order(planId, PRICE, 'en')]
    expect({ vi: vi.body.message, en: en.body.message }).toEqual({
      vi: 'Số PokeCoin dùng để giảm giá vượt quá mức cho phép (tối đa 50% giá gói)',
      en: 'The PokeCoin discount is above the limit (at most 50% of the plan price)'
    })
  })
})
