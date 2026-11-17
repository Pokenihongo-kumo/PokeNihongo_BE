import { maskEmail } from '@/common/utils/mask'
import { Injectable, Logger } from '@nestjs/common'
import { MailMessageInput, MailSender } from './mail-sender.port'

// MAIL_DRIVER=log: nothing leaves; one log line per mail. The subject and
// context are not logged (an OTP is in them). Tests and local demo only; the
// config refuses it in production.
@Injectable()
export class LogMailAdapter extends MailSender {
  private readonly logger = new Logger(LogMailAdapter.name)

  async send({ to, template }: MailMessageInput): Promise<void> {
    this.logger.log(`Mail not sent (MAIL_DRIVER=log): ${template} to ${maskEmail(to)}`)
  }
}
