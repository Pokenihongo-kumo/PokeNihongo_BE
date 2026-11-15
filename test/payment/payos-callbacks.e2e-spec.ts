import { AppModule } from '@/app.module'
import { PaymentRepo } from '@/modules/payment/payment.repo'
import { PaymentService } from '@/modules/payment/payment.service'
import { InvoiceService } from '@/modules/invoice/invoice.service'
import { PayOSService } from '@/shared/services/payos.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_ADMIN } from '../support/test-admin'

// PayOS return/cancel URLs are opened by the user's browser: their query
// string proves nothing. Only PayOS (server-to-server lookup or a signed
// webhook) may move a payment to PAID and grant the subscription.
// PayOS itself is faked; the test env has no PayOS credentials.
describe('PayOS callbacks (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let userId: number
  let lookup: jest.SpyInstance
  let verifyWebhook: jest.SpyInstance
  let grant: jest.SpyInstance
  const stamp = Date.now()
  const created = {
    subscription: 0,
    plan: 0,
    invoices: [] as number[],
    payments: [] as number[]
  }
  const PRICE = 99000

  // A pending payment the user is about to pay, as POST /payments/payos leaves it
  const pendingPayment = async (suffix: string) => {
    const invoice = await prisma.invoice.create({
      data: {
        userId,
        subscriptionPlanId: created.plan,
        subtotalAmount: PRICE,
        totalAmount: PRICE
      }
    })
    created.invoices.push(invoice.id)
    const payment = await prisma.payment.create({
      data: {
        userId,
        invoiceId: invoice.id,
        amount: PRICE,
        payosOrderId: `${stamp}${suffix}`
      }
    })
    created.payments.push(payment.id)
    return { invoice, payment, orderCode: `${stamp}${suffix}` }
  }
  const stateOf = async (paymentId: number, invoiceId: number) => ({
    payment: (await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }))
      .status,
    invoice: (await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } }))
      .status,
    subscriptions: await prisma.userSubscription.count({ where: { invoiceId } })
  })
  const payosSays = (status: string, amount = PRICE) =>
    lookup.mockImplementation(async (orderCode: number) => ({
      id: 'link',
      orderCode,
      amount,
      amountPaid: status === 'PAID' ? amount : 0,
      amountRemaining: status === 'PAID' ? 0 : amount,
      status,
      createdAt: new Date().toISOString(),
      transactions: []
    }))
  // What PayOS appends to the return URL: anyone can type it
  const forgedReturn = (orderCode: string) =>
    request(app.getHttpServer())
      .get('/payments/payos/return')
      .query({ code: '00', id: 'link', cancel: 'false', status: 'PAID', orderCode })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)
    await loginAsTestAdmin(app, [])
    userId = (await prisma.user.findFirstOrThrow({ where: { email: TEST_ADMIN.email } }))
      .id

    const subscription = await prisma.subscription.create({
      data: {
        nameKey: `subscription.test${stamp}.name`,
        descriptionKey: `subscription.test${stamp}.desc`
      }
    })
    created.subscription = subscription.id
    created.plan = (
      await prisma.subscriptionPlan.create({
        data: { subscriptionId: subscription.id, price: PRICE, type: 'LIFETIME' }
      })
    ).id

    lookup = jest.spyOn(PayOSService.prototype, 'getPaymentLinkInformation')
    verifyWebhook = jest.spyOn(PayOSService.prototype, 'verifyPaymentWebhookData')
    grant = jest.spyOn(InvoiceService.prototype, 'removeExpirationJob')
    // No mail in tests
    jest
      .spyOn(PaymentService.prototype, 'sendMailPayment')
      .mockResolvedValue(undefined as never)
  })

  beforeEach(() => {
    lookup.mockReset()
    verifyWebhook.mockReset()
    grant.mockClear()
  })

  afterAll(async () => {
    jest.restoreAllMocks()
    if (prisma) {
      await prisma.userSubscription.deleteMany({
        where: { invoiceId: { in: created.invoices } }
      })
      await prisma.payment.deleteMany({ where: { id: { in: created.payments } } })
      await prisma.invoice.deleteMany({ where: { id: { in: created.invoices } } })
      await prisma.subscriptionPlan.deleteMany({ where: { id: created.plan } })
      await prisma.subscription.deleteMany({ where: { id: created.subscription } })
    }
    await app?.close()
  })

  it('a forged return URL does not mark the payment paid or grant anything', async () => {
    const { payment, invoice, orderCode } = await pendingPayment('1')
    payosSays('PENDING')

    const res = await forgedReturn(orderCode)

    expect(res.status).toBe(302)
    expect(res.headers.location).not.toContain('/payment/success')
    expect(await stateOf(payment.id, invoice.id)).toEqual({
      payment: 'PENDING',
      invoice: 'PENDING',
      subscriptions: 0
    })
  })

  it('a forged cancel URL does not cancel a payment PayOS still has open', async () => {
    const { payment, invoice, orderCode } = await pendingPayment('2')
    payosSays('PENDING')

    await request(app.getHttpServer())
      .get('/payments/payos/cancel')
      .query({ code: '00', id: 'link', cancel: 'true', status: 'CANCELLED', orderCode })

    expect((await stateOf(payment.id, invoice.id)).payment).toBe('PENDING')
  })

  it('the return URL grants once PayOS confirms the full amount, and only once', async () => {
    const { payment, invoice, orderCode } = await pendingPayment('3')
    payosSays('PAID')

    const responses = await Promise.all([
      forgedReturn(orderCode),
      forgedReturn(orderCode)
    ])

    expect(
      responses
        .map((r) => r.headers.location)
        .every((l) => l.includes('/payment/success'))
    ).toBe(true)
    expect(grant).toHaveBeenCalledTimes(1)
    expect(await stateOf(payment.id, invoice.id)).toEqual({
      payment: 'PAID',
      invoice: 'PAID',
      subscriptions: 1
    })
  })

  it('a PayOS answer with another amount does not grant', async () => {
    const { payment, invoice, orderCode } = await pendingPayment('4')
    payosSays('PAID', 1000)

    await forgedReturn(orderCode)

    expect(await stateOf(payment.id, invoice.id)).toMatchObject({
      payment: 'PENDING',
      subscriptions: 0
    })
  })

  it('the webhook grants only with a valid signature, once', async () => {
    const { payment, invoice, orderCode } = await pendingPayment('5')
    const webhook = () =>
      request(app.getHttpServer())
        .post('/payments/payos/webhook')
        .send({
          code: '00',
          desc: 'success',
          success: true,
          data: { orderCode: Number(orderCode) },
          signature: 'x'
        })

    verifyWebhook.mockRejectedValue(new Error('bad signature'))
    const forged = await webhook()
    expect(forged.status).toBeGreaterThanOrEqual(400)
    expect((await stateOf(payment.id, invoice.id)).payment).toBe('PENDING')

    verifyWebhook.mockResolvedValue({
      orderCode: Number(orderCode),
      amount: PRICE,
      code: '00'
    })
    expect((await webhook()).status).toBe(200)
    expect((await webhook()).status).toBe(200)

    expect(grant).toHaveBeenCalledTimes(1)
    expect(await stateOf(payment.id, invoice.id)).toEqual({
      payment: 'PAID',
      invoice: 'PAID',
      subscriptions: 1
    })
  })

  it('cancelling a second payment link does not undo an invoice another link paid', async () => {
    // Two links for one invoice: the first expired here (only one may be
    // pending), the user reopened checkout, then paid the first one late at
    // PayOS; the second is cancelled afterwards
    const { payment: paid, invoice, orderCode } = await pendingPayment('6')
    await prisma.payment.update({ where: { id: paid.id }, data: { status: 'EXPIRED' } })
    const other = await prisma.payment.create({
      data: { userId, invoiceId: invoice.id, amount: PRICE, payosOrderId: `${stamp}7` }
    })
    created.payments.push(other.id)

    payosSays('PAID')
    await forgedReturn(orderCode)
    payosSays('CANCELLED')
    await request(app.getHttpServer())
      .get('/payments/payos/cancel')
      .query({
        code: '00',
        id: 'link',
        cancel: 'true',
        status: 'CANCELLED',
        orderCode: `${stamp}7`
      })

    expect({
      ...(await stateOf(paid.id, invoice.id)),
      other: (await prisma.payment.findUniqueOrThrow({ where: { id: other.id } })).status,
      subscription: (
        await prisma.userSubscription.findUniqueOrThrow({
          where: { invoiceId: invoice.id }
        })
      ).status
    }).toEqual({
      payment: 'PAID',
      invoice: 'PAID',
      subscriptions: 1,
      other: 'CANCELLED',
      subscription: 'ACTIVE'
    })
  })

  it('cancelling the only link of an unpaid invoice closes it', async () => {
    const { payment, invoice, orderCode } = await pendingPayment('8')
    await prisma.userSubscription.create({
      data: { userId, invoiceId: invoice.id, subscriptionPlanId: created.plan }
    })
    payosSays('CANCELLED')
    await request(app.getHttpServer())
      .get('/payments/payos/cancel')
      .query({ code: '00', id: 'link', cancel: 'true', status: 'CANCELLED', orderCode })

    expect({
      ...(await stateOf(payment.id, invoice.id)),
      subscription: (
        await prisma.userSubscription.findUniqueOrThrow({
          where: { invoiceId: invoice.id }
        })
      ).status
    }).toEqual({
      payment: 'CANCELLED',
      invoice: 'CANCELLED',
      subscriptions: 1,
      subscription: 'PAYMENT_FAILED'
    })
  })

  it('granting the plan fails: nothing is marked paid, the next callback grants once', async () => {
    const { payment, invoice, orderCode } = await pendingPayment('9')
    payosSays('PAID')
    // the database the payment module writes through (modules have their own)
    const db = (app.get(PaymentRepo) as unknown as { prisma: PrismaService }).prisma
    const transaction = db.$transaction.bind(db) as (fn: unknown) => Promise<unknown>
    jest.spyOn(db, '$transaction').mockImplementationOnce(((fn: unknown) =>
      transaction(async (tx: Prisma.TransactionClient) =>
        (fn as (tx: Prisma.TransactionClient) => Promise<unknown>)(
          new Proxy(tx, {
            get: (target, key) =>
              key === 'userSubscription'
                ? new Proxy(target.userSubscription, {
                    get: (sub, k) =>
                      k === 'create'
                        ? () => Promise.reject(new Error('DB unavailable (test double)'))
                        : Reflect.get(sub, k)
                  })
                : Reflect.get(target, key)
          })
        )
      )) as never)

    const failed = await forgedReturn(orderCode)
    expect(failed.headers.location).not.toContain('/payment/success')
    expect(await stateOf(payment.id, invoice.id)).toEqual({
      payment: 'PENDING',
      invoice: 'PENDING',
      subscriptions: 0
    })

    const retried = await forgedReturn(orderCode)
    expect(retried.headers.location).toContain('/payment/success')
    expect(await stateOf(payment.id, invoice.id)).toEqual({
      payment: 'PAID',
      invoice: 'PAID',
      subscriptions: 1
    })
    expect(
      (
        await prisma.userSubscription.findUniqueOrThrow({
          where: { invoiceId: invoice.id }
        })
      ).status
    ).toBe('ACTIVE')
  })
})
