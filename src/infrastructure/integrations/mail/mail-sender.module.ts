import envConfig from '@/config/env.config'
import { MailModule as MailerConfigModule } from '@/infrastructure/integrations/mail/mailer/mail.module'
import { Module } from '@nestjs/common'
import { LogMailAdapter } from './log-mail.adapter'
import { MailSender } from './mail-sender.port'
import { SmtpMailAdapter } from './smtp-mail.adapter'

const smtp = envConfig.MAIL_DRIVER === 'smtp'

// Provides the MailSender port. With MAIL_DRIVER=log the mailer (and its
// native css-inline addon) is not loaded at all.
@Module({
  imports: smtp ? [MailerConfigModule] : [],
  providers: [{ provide: MailSender, useClass: smtp ? SmtpMailAdapter : LogMailAdapter }],
  exports: [MailSender]
})
export class MailSenderModule {}
