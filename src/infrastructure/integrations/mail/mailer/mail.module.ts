import { MailerModule } from '@nestjs-modules/mailer'
import { Global, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { mailerConfigFactory, registerHandlebarsHelpers } from './mail.config'

@Global() // tuỳ bạn, đặt global nếu muốn dùng ở mọi nơi mà không phải import
@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: mailerConfigFactory,
      inject: [ConfigService]
    })
  ],
  exports: [MailerModule]
})
export class MailModule {
  constructor() {
    registerHandlebarsHelpers()
  }
}
