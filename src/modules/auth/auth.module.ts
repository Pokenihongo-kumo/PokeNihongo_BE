import { MailModule } from '@/3rdService/mail/mail.module'
import { UploadModule } from '@/3rdService/upload/upload.module'
import { AuthRepository } from '@/modules/auth/auth.repo'
import { UserProgressModule } from '@/modules/user-progress/user-progress.module'
import { UserTestModule } from '@/modules/user-test/user-test.module'
import { Module } from '@nestjs/common'
import { LevelModule } from '../level/level.module'
import { WalletModule } from '../wallet/wallet.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { GoogleService } from './google.service'

@Module({
  imports: [
    MailModule,
    UploadModule,
    LevelModule,
    UserProgressModule,
    UserTestModule,
    WalletModule
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, GoogleService]
})
export class AuthModule {}
