import {
  InvoiceStatus,
  PAYMENT_METHOD,
  PAYMENT_STATUS
} from '@/common/constants/invoice.constant'
import envConfig from '@/config/env.config'
// Legacy helpers không cần nữa cho invoice flow

import { UserCoreService } from '@/modules/user/user-core.service'
import { PaymentGateway } from '@/infrastructure/integrations/payment/payment-gateway.port'

import { MailService } from '@/3rdService/mail/mail.service'
import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { I18nService } from '@/i18n/i18n.service'
import { InvoiceMessage, PaymentMessage, SendMailMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { InjectQueue } from '@nestjs/bull'
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Queue } from 'bull'
import { CreateInvoiceBodyType } from '../invoice/entities/invoice.entity'
import { InvoiceService } from '../invoice/invoice.service'
import { SubscriptionPlanNotFoundException } from '../subscription-plan/dto/subscription-plan.error'
import { SubscriptionPlanService } from '@/modules/subscription-plan/subscription-plan.service'
import { UserSubscriptionService } from '../user-subscription/user-subscription.service'
import {
  ErrorPaymentToPayException,
  InvalidStatusPendingInvoiceToPayException,
  InvoiceNotFoundException,
  PaymentLinkInProgressException
} from './dto/payment.error'
import { CreatePayOSPaymentDto, PaymentType } from './entities/payment.model'
import { PaymentRepo } from './payment.repo'

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name)

  constructor(
    private readonly paymentRepo: PaymentRepo,
    private readonly subscriptionPlanService: SubscriptionPlanService,
    private readonly userSubscriptionSer: UserSubscriptionService,
    private readonly paymentGateway: PaymentGateway,
    private readonly userCoreService: UserCoreService,
    private readonly i18nService: I18nService,
    private readonly mailService: MailService,
    private readonly invoiceService: InvoiceService,
    @InjectQueue(BullQueue.INVOICE_EXPIRATION)
    private readonly invoiceExpirationQueue: Queue
  ) {}

  // POST /invoice: the pending invoice is committed first, then its payment
  // link is opened (the order the invoice module used to follow itself)
  async checkoutNewInvoice(
    { userId, data }: { userId: number; data: CreateInvoiceBodyType },
    lang: string = 'vi'
  ) {
    const invoice = await this.invoiceService.createPending({ userId, data })
    try {
      const paymentResult = await this.createPayOSPayment(
        { invoiceId: invoice.id },
        userId,
        lang
      )
      return {
        statusCode: 201,
        data: { invoice, payment: paymentResult.data },
        message: this.i18nService.translate(InvoiceMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error) || isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  // Create PayOS payment
  async createPayOSPayment(
    paymentData: CreatePayOSPaymentDto,
    userId: number,
    lang: string = 'vi'
  ) {
    try {
      const { invoiceId, buyerName, buyerEmail, buyerPhone } = paymentData
      console.log('create -payment')

      // 1. Lấy invoice
      const invoice = await this.invoiceService.getById(invoiceId)
      // Only the caller's own invoice: another user's answers like a missing one
      // (no PayOS call, their open link is not handed out)
      if (!invoice || invoice.userId !== userId) {
        throw new InvoiceNotFoundException()
      }

      if (invoice.status !== InvoiceStatus.PENDING) {
        throw new InvalidStatusPendingInvoiceToPayException()
      }

      // 2. Lấy subscription plan
      const plan = await this.subscriptionPlanService.getById(invoice.subscriptionPlanId)
      if (!plan) {
        throw new SubscriptionPlanNotFoundException()
      }

      // 3. Lấy thông tin user để fallback cho buyer info
      const user = await this.userCoreService.findUnique({ id: userId })
      if (!user) {
        throw new NotFoundRecordException()
      }

      // Sử dụng thông tin từ paymentData hoặc fallback từ user
      const finalBuyerName = buyerName || user.name || 'Unknown'
      const finalBuyerEmail = buyerEmail || user.email
      const finalBuyerPhone = buyerPhone || user.phoneNumber || ''

      // 4. Tạo orderCode duy nhất cho PayOS
      const orderCode = this.generateOrderCode()

      // 5. Tạo return/cancel URL
      const { returnUrl, cancelUrl } = this.paymentUrls()

      // 6. Sinh danh sách items (hiển thị trên PayOS)
      const items = [
        {
          name: plan.type === 'LIFETIME' ? 'Lifetime' : 'Recurring',
          quantity: 1,
          // must match the invoice total, in whole VND
          price: Math.round(invoice.totalAmount)
        }
      ]

      // 7. Tổng tiền lấy từ invoice.totalAmount (đã trừ giảm giá nếu có)
      // Chuẩn hóa về số nguyên VND theo yêu cầu PayOS
      const amount = Math.round(invoice.totalAmount)

      // 8. Chuẩn bị request tới PayOS
      const payosRequest = {
        orderCode,
        amount,
        description: `${plan.type === 'LIFETIME' ? 'Lifetime' : `Recurring`}`,
        items,
        buyerName: finalBuyerName,
        buyerEmail: finalBuyerEmail,
        buyerPhone: finalBuyerPhone,
        cancelUrl,
        returnUrl,
        expiredAt: Math.floor(Date.now() / 1000) + 15 * 60 // 15 phút
      }

      // 9. Hold the invoice's one open slot before calling PayOS (ADR D1 §2):
      // a concurrent or repeated request gets the same link, not a second one
      const reserved = await this.paymentRepo.reservePendingPayment({
        userId,
        invoiceId: invoice.id,
        paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
        amount,
        status: PAYMENT_STATUS.PENDING,
        payosOrderId: orderCode.toString(),
        payosPaymentLinkId: null,
        payosCheckoutUrl: null,
        payosQrCode: null,
        expiredAt: new Date(payosRequest.expiredAt * 1000),
        processedById: userId
      })
      if (!reserved) {
        const open = await this.paymentRepo.findLatestPendingByInvoice(invoice.id)
        // still being created by the other request: the client retries
        if (!open?.payosCheckoutUrl) throw new PaymentLinkInProgressException()
        return this.paymentLinkResult(open, lang)
      }

      // 10. Create the PayOS link; if it fails, free the slot for a retry
      let payosResponse: Awaited<ReturnType<PaymentGateway['createLink']>>
      try {
        payosResponse = await this.paymentGateway.createLink(payosRequest)
      } catch (error) {
        await this.paymentRepo.failReservedPayment(
          reserved.id,
          'PayOS payment link could not be created'
        )
        throw error
      }
      const payment = await this.paymentRepo.updatePayment(reserved.id, {
        payosPaymentLinkId: payosResponse.paymentLinkId,
        payosCheckoutUrl: payosResponse.checkoutUrl,
        payosQrCode: payosResponse.qrCode,
        expiredAt: new Date(payosResponse.expiredAt * 1000)
      })

      // 11. Kiểm tra và gia hạn Bull job nếu còn < 15 phút
      const jobId = `invoice-expire-${invoice.id}`
      const existingJob = await this.invoiceExpirationQueue.getJob(jobId)
      if (existingJob) {
        const now = Date.now()
        const jobDelay = existingJob.opts.delay || 0
        const jobCreatedAt = existingJob.timestamp
        const timeRemaining = jobCreatedAt + jobDelay - now
        const fifteenMinutes = 15 * 60 * 1000

        if (timeRemaining < fifteenMinutes) {
          // Xóa job cũ và tạo lại với delay 15 phút
          await existingJob.remove()
          await this.invoiceExpirationQueue.add(
            BullAction.EXPIRE_INVOICE,
            { invoiceId: invoice.id },
            {
              delay: fifteenMinutes,
              jobId,
              removeOnComplete: true,
              removeOnFail: true
            }
          )
        }
      }

      return {
        success: true,
        message: this.i18nService.translate(PaymentMessage.CREATE_SUCCESS, lang),
        data: {
          payment,
          payosData: {
            orderCode: payosResponse.orderCode,
            checkoutUrl: payosResponse.checkoutUrl,
            qrCode: payosResponse.qrCode,
            paymentLinkId: payosResponse.paymentLinkId,
            expiredAt: payosResponse.expiredAt,
            amount: payosResponse.amount
          }
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error
      }
      throw new ErrorPaymentToPayException()
    }
  }

  // A unique order code for the provider (timestamp based, 9 digits)
  private generateOrderCode(): number {
    return Number(String(Date.now()).slice(-9))
  }

  // Where the provider sends the browser back (the order code is added by it)
  private paymentUrls(): { returnUrl: string; cancelUrl: string } {
    const baseUrl = envConfig.APP_URL || 'http://localhost:4000'
    return {
      returnUrl: `${baseUrl}/payments/payos/return`,
      cancelUrl: `${baseUrl}/payments/payos/cancel`
    }
  }

  // The open link of an invoice, as POST /payments/payos answers it
  private paymentLinkResult(payment: PaymentType, lang: string) {
    const expiredAtMs = payment.expiredAt
      ? new Date(payment.expiredAt).getTime()
      : undefined
    return {
      success: true,
      message: this.i18nService.translate(PaymentMessage.CREATE_SUCCESS, lang),
      data: {
        payment,
        payosData: {
          orderCode: payment.payosOrderId ? Number(payment.payosOrderId) : undefined,
          checkoutUrl: payment.payosCheckoutUrl,
          qrCode: payment.payosQrCode,
          paymentLinkId: payment.payosPaymentLinkId,
          expiredAt: expiredAtMs ? Math.floor(expiredAtMs / 1000) : undefined,
          amount: payment.amount
        }
      }
    }
  }

  // ---- PayOS callbacks -------------------------------------------------
  // The return and cancel URLs are opened by the user's browser, so their query
  // string (code/status/cancel) proves nothing: anyone could open
  // /payos/return?code=00&status=PAID&orderCode=... and used to get the plan
  // without paying. The payment state now comes only from PayOS: a
  // server-to-server lookup of the order (return/cancel) or a webhook whose
  // signature the SDK verifies.

  // Handle PayOS return URL (UX redirect; state from PayOS)
  async handlePayOSReturn(returnData: { orderCode: number }, lang: string = 'vi') {
    return this.syncFromBrowserCallback(returnData.orderCode, lang)
  }

  // Handle PayOS cancel URL (UX redirect; state from PayOS)
  async handlePayOSCancel(cancelData: { orderCode: number }, lang: string = 'vi') {
    return this.syncFromBrowserCallback(cancelData.orderCode, lang)
  }

  /**
   * PayOS webhook. Answers 400 when the signature does not verify (the SDK
   * throws); otherwise 200, also for unknown orders (PayOS sends a test event
   * when the webhook URL is confirmed).
   */
  async handlePayOSWebhook(body: unknown, lang: string = 'vi') {
    const data = await this.paymentGateway.verifyWebhook(body)
    const payment = await this.paymentRepo.findPaymentByPayOSOrderId(
      String(data.orderCode)
    )
    if (payment && data.code === '00' && Number(data.amount) === Number(payment.amount)) {
      await this.grantPaidPayment(payment)
    }
    return {
      data: null,
      message: this.i18nService.translate(PaymentMessage.UPDATE_SUCCESS, lang)
    }
  }

  // Return/cancel: look the order up at PayOS, apply its state, pick the redirect
  private async syncFromBrowserCallback(orderCode: number, lang: string) {
    const feUrl = envConfig.FE_URL || 'http://localhost:3000'
    const failed = (error: string, message: string) => ({
      success: false,
      message,
      redirect: `${feUrl}/payment/failed?error=${error}&orderCode=${orderCode}`
    })

    try {
      const payment = Number.isFinite(orderCode)
        ? await this.paymentRepo.findPaymentByPayOSOrderId(String(orderCode))
        : null
      if (!payment) {
        return failed(
          'payment_not_found',
          this.i18nService.translate(PaymentMessage.NOT_FOUND, lang)
        )
      }

      if (payment.status !== PAYMENT_STATUS.PAID) {
        const info = await this.paymentGateway.getLink(Number(payment.payosOrderId))
        const fullyPaid =
          info.status === 'PAID' &&
          Number(info.orderCode) === Number(payment.payosOrderId) &&
          Number(info.amount) === Number(payment.amount)

        if (fullyPaid) {
          await this.grantPaidPayment(payment)
        } else if (info.status === 'FAILED') {
          await this.closeCancelledPayment(payment, 'FAILED', lang)
          return failed(
            'payment_failed',
            this.i18nService.translate(PaymentMessage.PAY_FAILED, lang)
          )
        } else if (info.status === 'CANCELLED' || info.status === 'EXPIRED') {
          await this.closeCancelledPayment(payment, info.status, lang)
          return failed(
            'payment_cancelled',
            this.i18nService.translate(PaymentMessage.PAY_CANCELLED, lang)
          )
        } else {
          // Not paid yet at PayOS (pending/processing, or an amount that does not
          // match): change nothing, the webhook settles it later
          return failed(
            'payment_pending',
            this.i18nService.translate(PaymentMessage.INVALID_STATUS_PENDING, lang)
          )
        }
      }

      const invoice = await this.invoiceService.getById(payment.invoiceId)
      const plan = invoice
        ? await this.subscriptionPlanService.getById(invoice.subscriptionPlanId)
        : null
      return {
        success: true,
        message: this.i18nService.translate(PaymentMessage.PAY_SUCCESS, lang),
        redirect: `${feUrl}/payment/success?orderId=${payment.payosOrderId}&amount=${payment.amount}&plan=${encodeURIComponent(plan ? (plan.type === 'LIFETIME' ? 'Lifetime' : `Recurring`) : '')}`
      }
    } catch (error) {
      console.error('PayOS callback error:', error)
      return failed(
        'system_error',
        this.i18nService.translate(PaymentMessage.ERROR_UNKNOWN_PAY, lang)
      )
    }
  }

  // PAID + subscription exactly once, in one transaction, whichever callback
  // (return, cancel, webhook) arrives first
  private async grantPaidPayment(payment: PaymentType) {
    const claimed = await this.paymentRepo.markInvoicePaidOnce(
      payment.id,
      payment.invoiceId
    )
    if (!claimed) return
    // After commit, outside the database: both are best effort. A job left in
    // the queue finds the invoice PAID and does nothing
    this.invoiceService
      .removeExpirationJob(payment.invoiceId)
      .catch((error: unknown) =>
        this.logger.warn(
          `Expiration job of invoice ${payment.invoiceId} not removed`,
          error instanceof Error ? error.name : 'error'
        )
      )
    // The confirmation mail is a courtesy: the plan is granted either way. Its
    // failure (mail provider down) is logged, never left as an unhandled rejection
    this.sendMailPayment(payment.invoiceId).catch((error: unknown) =>
      this.logger.error(
        `Payment mail for invoice ${payment.invoiceId} failed`,
        // name only: the provider message may repeat the address
        error instanceof Error ? error.name : 'error'
      )
    )
  }

  // PayOS says the order was cancelled/expired/failed. In one transaction:
  // the payment is closed if still PENDING, then its invoice is cancelled
  // (subscription PAYMENT_FAILED, PokeCoin discount given back) only while
  // still PENDING. An invoice another link paid (or is paying:
  // markInvoicePaidOnce holds its row) is left alone.
  private async closeCancelledPayment(
    payment: PaymentType,
    payosStatus: 'CANCELLED' | 'EXPIRED' | 'FAILED',
    lang: string
  ) {
    const data = {
      status: payosStatus,
      failureReason: this.i18nService.translate(
        payosStatus === 'FAILED'
          ? PaymentMessage.PAY_FAILED
          : PaymentMessage.PAY_CANCELLED,
        lang
      )
    }
    await this.paymentRepo.withTransaction(async (tx) => {
      if (await this.paymentRepo.closeIfPending(payment.id, data, tx)) {
        await this.invoiceService.cancelPending(payment.invoiceId, tx)
      }
    })
  }

  //todo mail
  async sendMailPayment(invoiceId: number) {
    // EmailService chưa được triển khai trong hệ thống hiện tại -> bỏ qua
    // lấy ra thông tin userSubscription
    const userSubscription =
      await this.userSubscriptionSer.getInforSubAndInvoiceWithUserSubId(invoiceId, 'vi')

    await this.mailService.sendSubscriptionSuccessVendorEmail(
      userSubscription.data.user.email,
      userSubscription.data.user.name,
      {
        subscriptionPlanId: userSubscription.data.userSubscriptionId.toString(),
        planName: userSubscription.data.planName || 'Unknown',
        startDate: userSubscription.data.startDate,
        endDate: userSubscription.data.expiresAt,
        status: userSubscription.data.status,
        price: userSubscription.data.subtotalAmount,
        paymentMethod: userSubscription.data.paymentMethod,
        discountAmount: userSubscription.data.discountAmount,
        totalAmount: userSubscription.data.totalAmount
      },
      SendMailMessage.REGISTER_SUBSCRIPTION_SUCCESS
    )
    return { skipped: true }
  }

  // (ĐÃ XOÁ) updateDateSubscription: không dùng cho Invoice + UserSubscription flow mới
}
