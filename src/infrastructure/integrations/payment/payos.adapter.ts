import envConfig from '@/config/env.config'
import { ErrorUnknowWithPayOSSystemException } from '@/shared/error'
import { Injectable, Logger } from '@nestjs/common'
import { PayOS } from '@payos/node'
import {
  CreatePaymentLinkInput,
  PaymentGateway,
  PaymentLink,
  PaymentLinkInfo,
  PaymentWebhookData
} from './payment-gateway.port'

// PAYMENT_DRIVER=payos: PayOS v2 (@payos/node). A provider failure is the
// 400 ErrorUnknowWithPayOSSystemException, as PayOSService answered.
@Injectable()
export class PayOSAdapter extends PaymentGateway {
  private readonly logger = new Logger(PayOSAdapter.name)
  private readonly payOS = new PayOS({
    clientId: envConfig.PAYOS_CLIENT_ID,
    apiKey: envConfig.PAYOS_API_KEY,
    checksumKey: envConfig.PAYOS_CHECKSUM_KEY
  })

  async createLink(input: CreatePaymentLinkInput): Promise<PaymentLink> {
    try {
      const response = await this.payOS.paymentRequests.create(input)
      this.logger.log(`PayOS payment link created: ${response.paymentLinkId}`)
      return {
        orderCode: response.orderCode,
        amount: response.amount,
        checkoutUrl: response.checkoutUrl,
        qrCode: response.qrCode,
        paymentLinkId: response.paymentLinkId,
        expiredAt: response.expiredAt ?? input.expiredAt
      }
    } catch (error) {
      this.logger.error('Failed to create PayOS payment link:', error)
      throw new ErrorUnknowWithPayOSSystemException()
    }
  }

  async getLink(orderCode: number): Promise<PaymentLinkInfo> {
    try {
      const info = await this.payOS.paymentRequests.get(orderCode)
      return {
        orderCode: info.orderCode,
        amount: info.amount,
        status: String(info.status)
      }
    } catch (error) {
      this.logger.error('Failed to get PayOS payment info:', error)
      throw new ErrorUnknowWithPayOSSystemException()
    }
  }

  async verifyWebhook(body: unknown): Promise<PaymentWebhookData> {
    try {
      const data = await this.payOS.webhooks.verify(body as never)
      this.logger.log(`PayOS webhook verified for order: ${data.orderCode}`)
      return { orderCode: data.orderCode, amount: data.amount, code: data.code }
    } catch (error) {
      this.logger.error('Failed to verify PayOS webhook data:', error)
      throw new ErrorUnknowWithPayOSSystemException()
    }
  }
}
