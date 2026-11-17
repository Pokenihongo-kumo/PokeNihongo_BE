import { RoleModule } from '@/modules/role/role.module'
import { UserCoreModule } from '@/modules/user/user-core.module'
import { MailSenderModule } from '@/infrastructure/integrations/mail/mail-sender.module'
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
import { MailToolsController } from './mail-tools.controller'
import { OtpService } from './otp.service'

@Module({
  imports: [
    RoleModule,
    UserCoreModule,
    MailSenderModule,
    UploadModule,
    LevelModule,
    UserProgressModule,
    UserTestModule,
    WalletModule
  ],
  // MailToolsController keeps the /mail staff routes (OTP send/verify)
  controllers: [AuthController, MailToolsController],
  providers: [AuthService, AuthRepository, GoogleService, OtpService]
})
export class AuthModule {}
