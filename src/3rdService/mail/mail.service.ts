import { I18nService } from '@/i18n/i18n.service'
import { MailSender } from '@/infrastructure/integrations/mail/mail-sender.port'
import { Injectable } from '@nestjs/common'

// What each non-OTP email says (subject, template, context); sending goes
// through the MailSender port (integration-ports plan I1). OTP mails moved to
// auth's OtpService.
@Injectable()
export class MailService {
  constructor(
    private readonly mailSender: MailSender,
    private readonly i18n: I18nService
  ) {}

  sendMail(to: string, subject: string, template: string, context: any): Promise<void> {
    return this.mailSender.send({ to, subject, template, context })
  }

  private formatDate(date: Date): string {
    if (!date) return ''
    const d = new Date(date)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
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
