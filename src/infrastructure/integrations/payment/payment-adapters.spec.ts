import { FakePaymentAdapter, fakeWebhookSignature } from './fake-payment.adapter'
import { PayOSAdapter } from './payos.adapter'

// PayOS cannot be called (service off): these pin how the adapters map the
// port to the SDK and what the fake does
const sdk = {
  paymentRequests: { create: jest.fn(), get: jest.fn() },
  webhooks: { verify: jest.fn() }
}
jest.mock('@payos/node', () => ({ PayOS: jest.fn().mockImplementation(() => sdk) }))

const link = {
  orderCode: 123,
  amount: 99000,
  description: 'Lifetime',
  items: [{ name: 'Lifetime', quantity: 1, price: 99000 }],
  returnUrl: 'http://localhost:4000/payments/payos/return',
  cancelUrl: 'http://localhost:4000/payments/payos/cancel',
  expiredAt: 1_900_000_000
}

describe('PayOSAdapter', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates a link with the input as is and keeps our fields only', async () => {
    sdk.paymentRequests.create.mockResolvedValue({
      orderCode: 123,
      amount: 99000,
      checkoutUrl: 'https://pay.payos.vn/x',
      qrCode: 'qr',
      paymentLinkId: 'pl',
      expiredAt: 1_900_000_100,
      bin: '970',
      accountNumber: '1'
    })
    await expect(new PayOSAdapter().createLink(link)).resolves.toEqual({
      orderCode: 123,
      amount: 99000,
      checkoutUrl: 'https://pay.payos.vn/x',
      qrCode: 'qr',
      paymentLinkId: 'pl',
      expiredAt: 1_900_000_100
    })
    expect(sdk.paymentRequests.create).toHaveBeenCalledWith(link)
  })

  it('reads an order and a verified webhook; a provider failure is a 400', async () => {
    sdk.paymentRequests.get.mockResolvedValue({
      orderCode: 123,
      amount: 99000,
      status: 'PAID',
      id: 'x'
    })
    sdk.webhooks.verify.mockResolvedValue({
      orderCode: 123,
      amount: 99000,
      code: '00',
      desc: 'ok'
    })
    const adapter = new PayOSAdapter()
    await expect(adapter.getLink(123)).resolves.toEqual({
      orderCode: 123,
      amount: 99000,
      status: 'PAID'
    })
    await expect(adapter.verifyWebhook({ any: 'body' })).resolves.toEqual({
      orderCode: 123,
      amount: 99000,
      code: '00'
    })
    sdk.webhooks.verify.mockRejectedValue(new Error('bad signature'))
    await expect(adapter.verifyWebhook({})).rejects.toMatchObject({ status: 400 })
  })
})

describe('FakePaymentAdapter', () => {
  it('opening the checkout URL pays: it is the return URL with the order code', async () => {
    const fake = new FakePaymentAdapter()
    const created = await fake.createLink(link)
    expect(created.checkoutUrl).toBe(
      'http://localhost:4000/payments/payos/return?orderCode=123'
    )
    await expect(fake.getLink(123)).resolves.toEqual({
      orderCode: 123,
      amount: 99000,
      status: 'PAID'
    })
    await expect(fake.getLink(999)).resolves.toEqual({
      orderCode: 999,
      amount: 0,
      status: 'PENDING'
    })
  })

  it('a webhook is accepted only with the local signature', async () => {
    const fake = new FakePaymentAdapter()
    const data = { orderCode: 123, amount: 99000, code: '00' }
    await expect(
      fake.verifyWebhook({ data, signature: fakeWebhookSignature(data) })
    ).resolves.toEqual(data)
    await expect(fake.verifyWebhook({ data, signature: 'forged' })).rejects.toMatchObject(
      { status: 400 }
    )
    await expect(fake.verifyWebhook({ data })).rejects.toMatchObject({ status: 400 })
  })
})
