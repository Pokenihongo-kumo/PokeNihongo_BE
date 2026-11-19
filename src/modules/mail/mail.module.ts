import { MailSenderModule } from '@/infrastructure/integrations/mail/mail-sender.module'
import { Module } from '@nestjs/common'
import { MailService } from './mail.service'

// Non-OTP emails (account, subscription); OTP lives in auth (OtpService)
@Module({
  imports: [MailSenderModule],
  providers: [MailService],
  exports: [MailService]
})
export class MailModule {}
