import { AppModule } from '@/app.module'
import { LogMailAdapter } from '@/infrastructure/integrations/mail/log-mail.adapter'
import { MailSender } from '@/infrastructure/integrations/mail/mail-sender.port'
import { MailerService } from '@nestjs-modules/mailer'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { App } from 'supertest/types'

// Integration-ports plan I1: with MAIL_DRIVER=log (.env.test) the app boots
// without any mail provider; MailSender is the log adapter and the mailer
// library is not loaded at all
describe('Mail driver (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app?.close()
  })

  it('MAIL_DRIVER=log: mails are logged, not sent, and the mailer is absent', async () => {
    const sender = app.get(MailSender, { strict: false })
    expect(sender).toBeInstanceOf(LogMailAdapter)
    await expect(
      sender.send({
        to: 'someone@example.test',
        subject: 's',
        template: 'otp',
        context: {}
      })
    ).resolves.toBeUndefined()
    expect(() => app.get(MailerService, { strict: false })).toThrow()
  })
})
