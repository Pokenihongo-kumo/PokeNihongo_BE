import { maskEmail } from '@/common/utils/mask'
import { MailerService } from '@nestjs-modules/mailer'
import { Injectable, Logger } from '@nestjs/common'
import { MailMessageInput, MailSender } from './mail-sender.port'

// MAIL_DRIVER=smtp: the real provider through @nestjs-modules/mailer
@Injectable()
export class SmtpMailAdapter extends MailSender {
  private readonly logger = new Logger(SmtpMailAdapter.name)

  constructor(private readonly mailerService: MailerService) {
    super()
  }

  async send({ to, subject, template, context }: MailMessageInput): Promise<void> {
    try {
      await this.mailerService.sendMail({ to, subject, template, context })
      this.logger.log(`Email sent to ${maskEmail(to)}`)
    } catch (error) {
      // The provider error may repeat the address or the subject (an OTP is in it)
      this.logger.error(
        `Failed to send email to ${maskEmail(to)}: ${error instanceof Error ? error.name : 'error'}`
      )
      throw error
    }
  }
}
