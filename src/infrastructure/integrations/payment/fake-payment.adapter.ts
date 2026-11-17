import envConfig from '@/config/env.config'
import { ErrorUnknowWithPayOSSystemException } from '@/shared/error'
import { Injectable, Logger } from '@nestjs/common'
import { createHmac, timingSafeEqual } from 'crypto'
import {
  CreatePaymentLinkInput,
  PaymentGateway,
  PaymentLink,
  PaymentLinkInfo,
  PaymentWebhookData
} from './payment-gateway.port'

// PAYMENT_DRIVER=fake: no PayOS, no key. Opening the checkout URL is paying:
// it is the return URL itself, and the fake reports every link it created as
// PAID for its amount. Webhooks are signed with FAKE_PAYMENT_SECRET. Tests and
// local demo only (D-IP2); the config refuses it in production.
export const fakeWebhookSignature = (data: unknown) =>
  createHmac('sha256', envConfig.FAKE_PAYMENT_SECRET)
    .update(JSON.stringify(data))
    .digest('hex')

@Injectable()
export class FakePaymentAdapter extends PaymentGateway {
  private readonly logger = new Logger(FakePaymentAdapter.name)
  private readonly links = new Map<number, number>() // orderCode -> amount

  async createLink(input: CreatePaymentLinkInput): Promise<PaymentLink> {
    this.links.set(input.orderCode, input.amount)
    this.logger.log(
      `Payment link not created at PayOS (PAYMENT_DRIVER=fake): ${input.orderCode}`
    )
    const separator = input.returnUrl.includes('?') ? '&' : '?'
    return {
      orderCode: input.orderCode,
      amount: input.amount,
      checkoutUrl: `${input.returnUrl}${separator}orderCode=${input.orderCode}`,
      qrCode: `fake-qr-${input.orderCode}`,
      paymentLinkId: `fake-${input.orderCode}`,
      expiredAt: input.expiredAt
    }
  }

  async getLink(orderCode: number): Promise<PaymentLinkInfo> {
    const amount = this.links.get(orderCode)
    return amount === undefined
      ? { orderCode, amount: 0, status: 'PENDING' }
      : { orderCode, amount, status: 'PAID' }
  }

  // body: { data: { orderCode, amount, code }, signature: hmac(data) }
  async verifyWebhook(body: unknown): Promise<PaymentWebhookData> {
    const { data, signature } = (body ?? {}) as {
      data?: PaymentWebhookData
      signature?: string
    }
    const expected = data ? fakeWebhookSignature(data) : ''
    const ok =
      typeof signature === 'string' &&
      signature.length === expected.length &&
      expected.length > 0 &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    if (!ok || !data) throw new ErrorUnknowWithPayOSSystemException()
    return {
      orderCode: Number(data.orderCode),
      amount: Number(data.amount),
      code: String(data.code)
    }
  }
}
