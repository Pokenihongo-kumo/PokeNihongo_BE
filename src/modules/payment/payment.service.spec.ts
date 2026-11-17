import { PaymentService } from './payment.service'

// The confirmation mail after a payment used to be fired without a catch: with
// the mail provider down its rejection was unhandled and ended the process.
describe('PaymentService: paid webhook when the mail provider is down', () => {
  const payment = { id: 5, invoiceId: 9, userId: 7, amount: 99000, payosOrderId: '123' }

  function createService() {
    const paymentRepo = {
      findPaymentByPayOSOrderId: jest.fn().mockResolvedValue(payment),
      markInvoicePaidOnce: jest.fn().mockResolvedValue(true)
    }
    const paymentGateway = {
      verifyWebhook: jest
        .fn()
        .mockResolvedValue({ orderCode: 123, code: '00', amount: 99000 })
    }
    const userSubscriptionSer = {
      getInforSubAndInvoiceWithUserSubId: jest.fn().mockResolvedValue({
        data: {
          user: { email: 'u@example.test', name: 'U' },
          userSubscriptionId: 1,
          planName: 'Plan',
          startDate: null,
          expiresAt: null,
          status: 'ACTIVE',
          subtotalAmount: 99000,
          paymentMethod: 'BANK_TRANSFER',
          discountAmount: 0,
          totalAmount: 99000
        }
      })
    }
    const mailService = {
      sendSubscriptionSuccessVendorEmail: jest
        .fn()
        .mockRejectedValue(new Error('SMTP unavailable'))
    }
    const invoiceService = { removeExpirationJob: jest.fn().mockResolvedValue(undefined) }
    const service = new PaymentService(
      paymentRepo as never,
      {} as never,
      userSubscriptionSer as never,
      paymentGateway as never,
      {} as never,
      { translate: (key: string) => key } as never,
      mailService as never,
      invoiceService as never,
      {} as never
    )
    return { service, paymentRepo, invoiceService, mailService }
  }

  it('grants the plan, logs the mail failure and leaves no unhandled rejection', async () => {
    const { service, paymentRepo, invoiceService, mailService } = createService()
    const logError = jest
      .spyOn((service as unknown as { logger: { error: () => void } }).logger, 'error')
      .mockImplementation(() => undefined)
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => unhandled.push(reason)
    process.on('unhandledRejection', onUnhandled)
    try {
      await expect(service.handlePayOSWebhook({})).resolves.toMatchObject({ data: null })
      // let the fire-and-forget mail settle
      await new Promise((resolve) => setImmediate(resolve))
      await new Promise((resolve) => setImmediate(resolve))
    } finally {
      process.off('unhandledRejection', onUnhandled)
    }
    expect(paymentRepo.markInvoicePaidOnce).toHaveBeenCalledWith(5, 9)
    expect(invoiceService.removeExpirationJob).toHaveBeenCalledWith(9)
    expect(mailService.sendSubscriptionSuccessVendorEmail).toHaveBeenCalled()
    expect(logError).toHaveBeenCalledWith(
      'Payment mail for invoice 9 failed',
      expect.any(String)
    )
    expect(unhandled).toEqual([])
  })
})
