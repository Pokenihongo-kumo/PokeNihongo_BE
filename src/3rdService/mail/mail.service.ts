import { I18nService } from '@/i18n/i18n.service'
import { MailerService } from '@nestjs-modules/mailer'
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
import { Redis } from 'ioredis' // Dùng Redis từ ioredis thay vì RedisClientType
import { maskEmail } from '@/common/utils/mask'
import { randomUUID } from 'crypto'
import { MailUnavailableException } from './mail.error'
import { codeOfStoredOtp, DELETE_IF_UNCHANGED, toStoredOtp } from './otp-value'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)

  constructor(
    private readonly mailerService: MailerService,
    private readonly i18n: I18nService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis
  ) {}

  async sendMail(
    to: string,
    subject: string,
    template: string,
    context: any
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template,
        context
      })
      this.logger.log(`Email sent to ${maskEmail(to)}`)
    } catch (error) {
      // The provider error may repeat the address or the subject (an OTP is in it)
      this.logger.error(
        `Failed to send email to ${maskEmail(to)}: ${error instanceof Error ? error.name : 'error'}`
      )
      throw error
    }
  }

  async sendOtpMail(
    to: string,
    otp: string,
    template: string,
    content: string,
    body: string
  ): Promise<void> {
    const subject = 'Hãy xác thực ' + otp
    const link = 'http://127.0.0.1:4000/auth/verified-email/' + to
    const context = { otp, content, body, link }
    await this.sendMail(to, subject, template, context)
  }

  async generateAndSendOtp(
    email: string,
    template: string,
    content: string,
    body: string
  ): Promise<void> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString() // Tạo OTP 6 chữ số
    // Replaces the previous code, valid 5 minutes
    const stored = toStoredOtp(otp, randomUUID())
    await this.redisClient.set(email, stored, 'EX', 300)
    try {
      await this.sendOtpMail(email, otp, template, content, body)
    } catch {
      // Nobody received this code: drop it, unless a newer send has replaced it
      await this.redisClient.eval(DELETE_IF_UNCHANGED, 1, email, stored)
      throw new MailUnavailableException()
    }
    // Never log the code itself
    this.logger.log(`OTP sent to ${maskEmail(email)}`)
  }

  async verifyOtpStrict(email: string, otp: string): Promise<boolean> {
    try {
      const storedOtp = codeOfStoredOtp(await this.redisClient.get(email))
      if (storedOtp === otp) {
        // Xóa OTP sau khi xác thực thành công
        await this.redisClient.del(email)
        this.logger.log(`OTP verified and deleted for ${maskEmail(email)}`)
        return true
      }
      //

      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn')
    } catch (error) {
      this.logger.error(`Failed to verify OTP for ${maskEmail(email)}: ${error.message}`)
      throw error
    }
  }

  async sendBookingCancellationEmail(
    email: string,
    fullName: string,
    bookingCode: string,
    bookingDate: Date,
    bookingTime: string,
    reason: string
  ): Promise<void> {
    const subject = 'Thông báo hủy đặt lịch - PhotoGo'
    const context = {
      fullName,
      bookingCode,
      bookingDate: this.formatDate(bookingDate),
      bookingTime,
      reason,
      supportEmail: 'support@photogo.id.vn'
    }

    await this.sendMail(email, subject, 'booking-cancellation', context)
  }

  private formatDate(date: Date): string {
    if (!date) return ''
    const d = new Date(date)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }

  async sendRefundNotificationEmail(
    email: string,
    fullName: string,
    refundAmount: number,
    refundMethod: string,
    refundNote: string
  ): Promise<void> {
    const subject = 'Thông báo hoàn tiền - PhotoGo'
    const context = {
      fullName,
      refundAmount: refundAmount.toLocaleString('vi-VN'),
      refundMethod,
      refundNote,
      supportEmail: 'support@photogo.id.vn'
    }

    await this.sendMail(email, subject, 'refund-notification', context)
  }

  async sendSubscriptionSuccessEmail(
    email: string,
    customerName: string,
    subscriptionData: {
      subscriptionId: string
      planName: string
      startDate: Date
      endDate: Date
      billingCycle: string
      status: string
      price: number
      paymentMethod: string
      nextBillingDate?: Date
    }
  ): Promise<void> {
    const subject = 'Đăng ký Subscription Thành công - PhotoGo'

    // Format dates
    const startDate = this.formatDate(subscriptionData.startDate)
    const endDate = this.formatDate(subscriptionData.endDate)
    const nextBillingDate = subscriptionData.nextBillingDate
      ? this.formatDate(subscriptionData.nextBillingDate)
      : null

    // Format price
    const price = subscriptionData.price.toLocaleString('vi-VN') + ' VNĐ'

    // Determine status class for styling
    const statusClass = subscriptionData.status === 'hoạt động' ? 'active' : 'pending'

    const context = {
      customerName,
      customerEmail: email,
      subscriptionId: subscriptionData.subscriptionId,
      planName: subscriptionData.planName,
      startDate,
      endDate,
      billingCycle: subscriptionData.billingCycle,
      status: subscriptionData.status,
      statusClass,
      price,
      paymentMethod: subscriptionData.paymentMethod,
      nextBillingDate,
      supportEmail: 'support@photogo.id.vn'
    }

    await this.sendMail(email, subject, 'subscription-success', context)
  }

  async sendSubscriptionSuccessVendorEmail(
    email: string,
    vendorName: string,
    subscriptionData: {
      subscriptionPlanId: string
      planName: string
      startDate: Date | null
      endDate: Date | null
      status: string
      price: number
      paymentMethod: string
      discountAmount: number
      totalAmount: number
    },
    keySubject: string
  ): Promise<void> {
    const subject = await this.i18n.translate(keySubject)
    // Format dates
    const startDate = subscriptionData.startDate
      ? this.formatDate(subscriptionData.startDate)
      : ''
    const endDate = subscriptionData.endDate
      ? this.formatDate(subscriptionData.endDate)
      : ''
    // Format price

    const price = subscriptionData.price.toLocaleString('vi-VN') + ' VNĐ'
    // Determine status class for styling
    const statusClass = subscriptionData.status
    const context = {
      vendorName,
      vendorEmail: email,
      subscriptionPlanId: subscriptionData.subscriptionPlanId,
      planName: subscriptionData.planName,
      startDate,
      endDate,
      status: subscriptionData.status,
      statusClass,
      price,
      discountAmount: subscriptionData.discountAmount.toLocaleString('vi-VN') + ' VNĐ',
      totalAmount: subscriptionData.totalAmount.toLocaleString('vi-VN') + ' VNĐ',
      paymentMethod: subscriptionData.paymentMethod,
      supportEmail: 'support@pokenihongo.com'
    }
    await this.sendMail(email, subject, 'subscription-success-vendor', context)
  }

  async sendSubscriptionExpiringSoonEmail(
    email: string,
    userName: string,
    subscriptionData: {
      planName: string
      expiresAt: Date
      daysLeft: number
    }
  ): Promise<void> {
    const subject = `⚠️ Thông báo: Gói Subscription sắp hết hạn trong ${subscriptionData.daysLeft} ngày`
    const context = {
      userName,
      planName: subscriptionData.planName,
      expiresAt: this.formatDate(subscriptionData.expiresAt),
      daysLeft: subscriptionData.daysLeft,
      supportEmail: 'support@pokenihongo.com'
    }
    await this.sendMail(email, subject, 'subscription-expiring-soon', context)
  }

  async sendEmailPasswordAccount(
    to: string,
    template: string,
    content: string,
    bodyContent: string,
    email: string,
    password: string
  ): Promise<void> {
    const subject = 'Tài khoản của bạn đã được tạo'
    const context = {
      content,
      bodyContent,
      email,
      password,
      supportEmail: 'support@pokenihongo.com'
    }
    await this.sendMail(to, subject, template, context)
  }
}
