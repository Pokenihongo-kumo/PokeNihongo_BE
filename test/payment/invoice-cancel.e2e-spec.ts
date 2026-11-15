import { AppModule } from '@/app.module'
import { walletType } from '@/common/constants/wallet.constant'
import { PayOSService } from '@/shared/services/payos.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { InvoiceExpirationProcessor } from '@/shared/workers/invoice-expiration.processor'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { Job } from 'bull'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_ADMIN } from '../support/test-admin'

// Cancelling an unpaid invoice (ADR D1 §3): the expiration job and the PayOS
// cancel callback share one conditional step. The PokeCoin discount comes back
// exactly once (the callback used to give nothing back, and the job then saw
// the invoice cancelled and gave nothing back either); a paid invoice is never
// cancelled or refunded. PayOS is faked.
describe('Invoice cancel and coin refund (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let processor: InvoiceExpirationProcessor
  let lookup: jest.SpyInstance
  let userId: number
  let walletId: number
  let originalCoins: number | null = null
  const stamp = Date.now()
  const created = {
    subscription: 0,
    plan: 0,
    invoices: [] as number[],
    payments: [] as number[]
  }
  const PRICE = 99000
  const DISCOUNT = 5000

  const coins = async () =>
    (await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } })).balance
  const refunds = (invoiceId: number) =>
    prisma.walletTransaction.count({
      where: { referenceId: invoiceId, purpose: 'REFUND', userId }
    })
  // An invoice that took DISCOUNT coins, with a pending link and subscription
  const discountedInvoice = async (suffix: string) => {
    const invoice = await prisma.invoice.create({
      data: {
        userId,
        subscriptionPlanId: created.plan,
        subtotalAmount: PRICE,
        discountAmount: DISCOUNT,
        totalAmount: PRICE - DISCOUNT
      }
    })
    created.invoices.push(invoice.id)
    await prisma.userSubscription.create({
      data: { userId, invoiceId: invoice.id, subscriptionPlanId: created.plan }
    })
    const payment = await prisma.payment.create({
      data: {
        userId,
        invoiceId: invoice.id,
        amount: PRICE - DISCOUNT,
        payosOrderId: `${stamp}${suffix}`
      }
    })
    created.payments.push(payment.id)
    return { invoice, payment, orderCode: `${stamp}${suffix}` }
  }
  const expire = (invoiceId: number) =>
    processor.handleExpireInvoice({ data: { invoiceId } } as Job<{ invoiceId: number }>)
  const cancelCallback = (orderCode: string) =>
    request(app.getHttpServer()).get('/payments/payos/cancel').query({ orderCode })
  const payosSays = (status: string) =>
    lookup.mockImplementation(async (orderCode: number) => ({
      orderCode,
      amount: PRICE - DISCOUNT,
      status
    }))
  const statusOf = async (invoiceId: number) => ({
    invoice: (await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } }))
      .status,
    subscription: (
      await prisma.userSubscription.findUniqueOrThrow({ where: { invoiceId } })
    ).status
  })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)
    processor = app.get(InvoiceExpirationProcessor)
    await loginAsTestAdmin(app, [])
    userId = (await prisma.user.findFirstOrThrow({ where: { email: TEST_ADMIN.email } }))
      .id
    const wallet = await prisma.wallet.findUnique({
      where: { userId_type: { userId, type: walletType.POKE_COINS } }
    })
    originalCoins = wallet?.balance ?? null
    walletId = (
      wallet ??
      (await prisma.wallet.create({ data: { userId, type: walletType.POKE_COINS } }))
    ).id
    created.subscription = (
      await prisma.subscription.create({
        data: {
          nameKey: `subscription.cancel${stamp}.name`,
          descriptionKey: `subscription.cancel${stamp}.desc`
        }
      })
    ).id
    created.plan = (
      await prisma.subscriptionPlan.create({
        data: { subscriptionId: created.subscription, price: PRICE, type: 'LIFETIME' }
      })
    ).id
    lookup = jest.spyOn(PayOSService.prototype, 'getPaymentLinkInformation')
  })

  afterAll(async () => {
    jest.restoreAllMocks()
    if (prisma) {
      await prisma.walletTransaction.deleteMany({
        where: { referenceId: { in: created.invoices }, purpose: 'REFUND', userId }
      })
      await prisma.userSubscription.deleteMany({
        where: { invoiceId: { in: created.invoices } }
      })
      await prisma.payment.deleteMany({ where: { id: { in: created.payments } } })
      await prisma.invoice.deleteMany({ where: { id: { in: created.invoices } } })
      await prisma.subscriptionPlan.deleteMany({ where: { id: created.plan } })
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

  it('cancelled at PayOS: the invoice closes and the coins come back', async () => {
    const { invoice, orderCode } = await discountedInvoice('1')
    const before = await coins()
    payosSays('CANCELLED')
    await cancelCallback(orderCode)
    expect(await statusOf(invoice.id)).toEqual({
      invoice: 'CANCELLED',
      subscription: 'PAYMENT_FAILED'
    })
    expect(await coins()).toBe(before + DISCOUNT)
    expect(await refunds(invoice.id)).toBe(1)

    // the expiration job runs later: nothing more
    await expire(invoice.id)
    expect(await coins()).toBe(before + DISCOUNT)
    expect(await refunds(invoice.id)).toBe(1)
  })

  it('job and cancel callback at once: the coins come back once', async () => {
    const { invoice, orderCode } = await discountedInvoice('2')
    const before = await coins()
    payosSays('CANCELLED')
    await Promise.all([expire(invoice.id), cancelCallback(orderCode), expire(invoice.id)])
    expect((await statusOf(invoice.id)).invoice).toBe('CANCELLED')
    expect(await coins()).toBe(before + DISCOUNT)
    expect(await refunds(invoice.id)).toBe(1)
  })

  it('a paid invoice is not expired or refunded', async () => {
    const { invoice } = await discountedInvoice('3')
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'PAID' } })
    await prisma.userSubscription.update({
      where: { invoiceId: invoice.id },
      data: { status: 'ACTIVE' }
    })
    const before = await coins()
    await expire(invoice.id)
    expect(await statusOf(invoice.id)).toEqual({
      invoice: 'PAID',
      subscription: 'ACTIVE'
    })
    expect(await coins()).toBe(before)
    expect(await refunds(invoice.id)).toBe(0)
  })
})
