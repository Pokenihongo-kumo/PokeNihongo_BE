import { AppModule } from '@/app.module'
import { PayOSService } from '@/shared/services/payos.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// POST /payments/payos (A1 T9a): a payment link is made only for the caller's
// own invoice. Another user's invoice answers 404 (its existence is not
// revealed), PayOS is not called and an open link of theirs is not returned.
describe('Payment link ownership (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let createLink: jest.SpyInstance
  const stamp = Date.now()
  const created = {
    users: [] as number[],
    invoices: [] as number[],
    payments: [] as number[]
  }
  let planId = 0
  let subscriptionId = 0
  const PRICE = 99000

  const invoiceOf = async (userId: number) => {
    const invoice = await prisma.invoice.create({
      data: {
        userId,
        subscriptionPlanId: planId,
        subtotalAmount: PRICE,
        totalAmount: PRICE
      }
    })
    created.invoices.push(invoice.id)
    return invoice
  }
  const pay = (invoiceId: number) =>
    request(app.getHttpServer())
      .post('/payments/payos')
      .set('User-Agent', TEST_USER_AGENT)
      .auth(token, { type: 'bearer' })
      .send({ invoiceId })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)
    token = await loginAsTestAdmin(app, [{ method: 'POST', path: '/payments/payos' }])
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_ADMIN.email }
    })
    created.users.push(
      (
        await prisma.user.create({
          data: {
            email: `payment-owner-${stamp}@example.test`,
            name: 'Payment other user',
            password: 'not-a-login',
            roleId: admin.roleId
          }
        })
      ).id
    )
    subscriptionId = (
      await prisma.subscription.create({
        data: {
          nameKey: `subscription.owner${stamp}.name`,
          descriptionKey: `subscription.owner${stamp}.desc`
        }
      })
    ).id
    planId = (
      await prisma.subscriptionPlan.create({
        data: { subscriptionId, price: PRICE, type: 'LIFETIME' }
      })
    ).id
    createLink = jest.spyOn(PayOSService.prototype, 'createPaymentLink')
  })

  beforeEach(() => createLink.mockReset())

  afterAll(async () => {
    jest.restoreAllMocks()
    if (prisma) {
      await prisma.payment.deleteMany({ where: { invoiceId: { in: created.invoices } } })
      await prisma.invoice.deleteMany({ where: { id: { in: created.invoices } } })
      await prisma.subscriptionPlan.deleteMany({ where: { id: planId } })
      await prisma.subscription.deleteMany({ where: { id: subscriptionId } })
      await prisma.user.deleteMany({ where: { id: { in: created.users } } })
    }
    await app?.close()
  })

  it("another user's invoice: 404, PayOS is not called", async () => {
    const theirs = await invoiceOf(created.users[0])
    const res = await pay(theirs.id)
    expect({ status: res.status, statusCode: res.body.statusCode }).toEqual({
      status: 404,
      statusCode: 404
    })
    expect(createLink).not.toHaveBeenCalled()
    expect(await prisma.payment.count({ where: { invoiceId: theirs.id } })).toBe(0)
  })

  it("another user's open payment link is not handed out", async () => {
    const theirs = await invoiceOf(created.users[0])
    await prisma.payment.create({
      data: {
        userId: created.users[0],
        invoiceId: theirs.id,
        amount: PRICE,
        payosOrderId: `${stamp}9`,
        payosCheckoutUrl: 'https://pay.example.test/their-link',
        expiredAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    })
    const res = await pay(theirs.id)
    expect(res.status).toBe(404)
    expect(JSON.stringify(res.body)).not.toContain('their-link')
  })

  it("the caller's own invoice still gets a link", async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_ADMIN.email }
    })
    const mine = await invoiceOf(admin.id)
    createLink.mockResolvedValue({
      orderCode: 1,
      checkoutUrl: 'https://pay.example.test/mine',
      qrCode: 'qr',
      paymentLinkId: 'link',
      expiredAt: Math.floor(Date.now() / 1000) + 900,
      amount: PRICE
    })
    const res = await pay(mine.id)
    expect(res.status).toBe(201)
    expect(createLink).toHaveBeenCalledTimes(1)
  })
})
