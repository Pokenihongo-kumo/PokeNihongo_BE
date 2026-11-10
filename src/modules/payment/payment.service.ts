import {
  InvoiceStatus,
  PAYMENT_METHOD,
  PAYMENT_STATUS
} from '@/common/constants/invoice.constant'
import envConfig from '@/config/env.config'
// Legacy helpers không cần nữa cho invoice flow

import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { PayOSService } from '../../shared/services/payos.service'

import { MailService } from '@/3rdService/mail/mail.service'
import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { I18nService } from '@/i18n/i18n.service'
import { PaymentMessage, SendMailMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import { InjectQueue } from '@nestjs/bull'
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef
} from '@nestjs/common'
import { Queue } from 'bull'
import { InvoiceRepo } from '../invoice/invoice.repo'
import { InvoiceService } from '../invoice/invoice.service'
import { SubscriptionPlanNotFoundException } from '../subscription-plan/dto/subscription-plan.error'
import { SubscriptionPlanRepo } from '../subscription-plan/subscription-plan.repo'
import { UserSubscriptionService } from '../user-subscription/user-subscription.service'
import {
  ErrorPaymentToPayException,
  InvalidStatusPendingInvoiceToPayException,
  InvoiceNotFoundException
} from './dto/payment.error'
import { CreatePayOSPaymentDto, PaymentType } from './entities/payment.model'
import { PaymentRepo } from './payment.repo'

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepo: PaymentRepo,
    private readonly invoiceRepo: InvoiceRepo,
    private readonly subscriptionPlanRepo: SubscriptionPlanRepo,
    private readonly userSubscriptionSer: UserSubscriptionService,
    private readonly payosService: PayOSService,
    private readonly userService: SharedUserRepository,
    private readonly i18nService: I18nService,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => InvoiceService))
    private readonly invoiceService: InvoiceService,
    @InjectQueue(BullQueue.INVOICE_EXPIRATION)
    private readonly invoiceExpirationQueue: Queue
  ) {}
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
      const invoice = await this.invoiceRepo.findById(invoiceId)
      if (!invoice) {
        throw new InvoiceNotFoundException()
      }

      if (invoice.status !== InvoiceStatus.PENDING) {
        throw new InvalidStatusPendingInvoiceToPayException()
      }

      // 1.1. Nếu đã có payment PENDING còn hạn cho invoice này thì trả về luôn
      const existingPending = await this.paymentRepo.findLatestPendingByInvoice(
        invoice.id
      )
      if (existingPending) {
        const now = Date.now()
        const expiredAtMs = existingPending.expiredAt
          ? new Date(existingPending.expiredAt).getTime()
          : undefined
        if (expiredAtMs && expiredAtMs > now) {
          return {
            success: true,
            message: this.i18nService.translate(PaymentMessage.CREATE_SUCCESS, lang),
            data: {
              payment: existingPending,
              payosData: {
                orderCode: existingPending.payosOrderId
                  ? Number(existingPending.payosOrderId)
                  : undefined,
                checkoutUrl: existingPending.payosCheckoutUrl,
                qrCode: existingPending.payosQrCode,
                paymentLinkId: existingPending.payosPaymentLinkId,
                expiredAt: expiredAtMs ? Math.floor(expiredAtMs / 1000) : undefined,
                amount: existingPending.amount
              }
            }
          }
        } else if (expiredAtMs && expiredAtMs <= now) {
          await this.paymentRepo.updatePayment(existingPending.id, {
            status: PAYMENT_STATUS.EXPIRED,
            failureReason: 'Payment link expired'
          })
        }
      }

      // 2. Lấy subscription plan
      const plan = await this.subscriptionPlanRepo.getById(invoice.subscriptionPlanId)
      if (!plan) {
        throw new SubscriptionPlanNotFoundException()
      }

      // 3. Lấy thông tin user để fallback cho buyer info
      const user = await this.userService.findUnique({ id: userId })
      if (!user) {
        throw new NotFoundRecordException()
      }

      // Sử dụng thông tin từ paymentData hoặc fallback từ user
      const finalBuyerName = buyerName || user.name || 'Unknown'
      const finalBuyerEmail = buyerEmail || user.email
      const finalBuyerPhone = buyerPhone || user.phoneNumber || ''

      // 4. Tạo orderCode duy nhất cho PayOS
      const orderCode = this.payosService.generateOrderCode()

      // 5. Tạo return/cancel URL
      const { returnUrl, cancelUrl } = this.payosService.generatePaymentUrls(invoice.id)

      // 6. Sinh danh sách items (hiển thị trên PayOS)
      const items = this.payosService.createPayOSItems({ invoice, plan })

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

      // 9. Gọi PayOS tạo link
      const payosResponse = await this.payosService.createPaymentLink(payosRequest)

      // 10. Lưu Payment (PENDING)
      const payment = await this.paymentRepo.createPayment({
        userId,
        invoiceId: invoice.id,
        paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
        amount,
        status: PAYMENT_STATUS.PENDING,
        payosOrderId: orderCode.toString(),
        payosPaymentLinkId: payosResponse.paymentLinkId,
        payosCheckoutUrl: payosResponse.checkoutUrl,
        payosQrCode: payosResponse.qrCode,
        expiredAt: new Date(payosResponse.expiredAt * 1000),
        processedById: userId
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
    const data = await this.payosService.verifyPaymentWebhookData(body)
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
        const info = await this.payosService.getPaymentLinkInformation(
          Number(payment.payosOrderId)
        )
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

      const invoice = await this.invoiceRepo.findById(payment.invoiceId)
      const plan = invoice
        ? await this.subscriptionPlanRepo.getById(invoice.subscriptionPlanId)
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

  // PAID + subscription exactly once, whichever callback (return, cancel, webhook) arrives first
  private async grantPaidPayment(payment: PaymentType) {
    const claimed = await this.paymentRepo.markInvoicePaidOnce(
      payment.id,
      payment.invoiceId
    )
    if (!claimed) return
    // Delegate subscription creation + job cleanup to invoice service
    await this.invoiceService.updateInvoiceWhenPaymentSuccess(payment.invoiceId)
    // Gửi mail (tạm thời no-op)
    this.sendMailPayment(payment.invoiceId)
  }

  // PayOS says the order was cancelled/expired/failed: close it if it is still pending
  private async closeCancelledPayment(
    payment: PaymentType,
    payosStatus: 'CANCELLED' | 'EXPIRED' | 'FAILED',
    lang: string
  ) {
    const closed = await this.paymentRepo.closePendingPayment(payment.id, {
      status: payosStatus,
      failureReason: this.i18nService.translate(
        payosStatus === 'FAILED'
          ? PaymentMessage.PAY_FAILED
          : PaymentMessage.PAY_CANCELLED,
        lang
      )
    })
    if (!closed) return

    const invoice = await this.invoiceRepo.findById(payment.invoiceId)
    if (!invoice) return
    await this.invoiceRepo.update({
      id: payment.invoiceId,
      data: { status: InvoiceStatus.CANCELLED }
    })
    const userSubscription = await this.userSubscriptionSer.findByUserAndInvoice(
      payment.userId,
      invoice.id
    )
    if (userSubscription) {
      await this.userSubscriptionSer.update({
        id: userSubscription.id,
        data: { status: 'PAYMENT_FAILED' }
      })
    }
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
