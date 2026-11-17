import { AppModule } from '@/app.module'
import { PaymentGateway } from '@/infrastructure/integrations/payment/payment-gateway.port'
import { FakePaymentAdapter } from '@/infrastructure/integrations/payment/fake-payment.adapter'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Integration-ports plan I2, D-IP2: with PAYMENT_DRIVER=fake a plan can be
// bought locally without PayOS: the invoice's checkout link is the return URL,
// and opening it grants the plan once (through the same PayOS-state check).
describe('Fake payment demo (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let userId: number
  const stamp = Date.now()
  const created = { subscription: 0, plan: 0 }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)
    token = await loginAsTestAdmin(app, [{ method: 'POST', path: '/invoice' }])
    userId = (await prisma.user.findUniqueOrThrow({ where: { email: TEST_ADMIN.email } }))
      .id
    created.subscription = (
      await prisma.subscription.create({
        data: {
          nameKey: `subscription.demo${stamp}.name`,
          descriptionKey: `subscription.demo${stamp}.desc`
        }
      })
    ).id
    created.plan = (
      await prisma.subscriptionPlan.create({
        data: {
          subscriptionId: created.subscription,
          price: 50000,
          type: 'LIFETIME',
          isActive: true
        }
      })
    ).id
  })

  afterAll(async () => {
    if (prisma) {
      const invoices = await prisma.invoice.findMany({
        where: { subscriptionPlanId: created.plan },
        select: { id: true }
      })
      const ids = invoices.map((i) => i.id)
      await prisma.userSubscription.deleteMany({ where: { invoiceId: { in: ids } } })
      await prisma.payment.deleteMany({ where: { invoiceId: { in: ids } } })
      await prisma.invoice.deleteMany({ where: { id: { in: ids } } })
      await prisma.subscriptionPlan.deleteMany({ where: { id: created.plan } })
      await prisma.subscription.deleteMany({ where: { id: created.subscription } })
    }
    await app?.close()
  })

  it('buy a plan: the link is the return URL, opening it grants the plan once', async () => {
    expect(app.get(PaymentGateway, { strict: false })).toBeInstanceOf(FakePaymentAdapter)
    const ordered = await request(app.getHttpServer())
      .post('/invoice')
      .set('User-Agent', TEST_USER_AGENT)
      .auth(token, { type: 'bearer' })
      .send({ subscriptionPlanId: created.plan, discountAmount: 0 })
    expect(ordered.status).toBe(201)
    const checkoutUrl: string = ordered.body.data.payment.payosData.checkoutUrl
    const url = new URL(checkoutUrl)
    expect(url.pathname).toBe('/payments/payos/return')

    const opened = await request(app.getHttpServer()).get(`${url.pathname}${url.search}`)
    expect(opened.status).toBe(302)
    expect(opened.headers.location).toContain('/payment/success')
    const invoiceId: number = ordered.body.data.invoice.id
    const subscription = await prisma.userSubscription.findUniqueOrThrow({
      where: { invoiceId }
    })
    expect({ status: subscription.status, userId: subscription.userId }).toEqual({
      status: 'ACTIVE',
      userId
    })

    // opening it again grants nothing more
    await request(app.getHttpServer()).get(`${url.pathname}${url.search}`)
    expect(await prisma.userSubscription.count({ where: { invoiceId } })).toBe(1)
  })
})
