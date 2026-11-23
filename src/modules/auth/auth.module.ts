import { RefreshTokenCleanupCronjob } from './refresh-token-cleanup.cronjob'
import { UserSubscriptionModule } from '@/modules/user-subscription/user-subscription.module'
import { RoleModule } from '@/modules/role/role.module'
import { UserCoreModule } from '@/modules/user/user-core.module'
import { MailSenderModule } from '@/infrastructure/integrations/mail/mail-sender.module'
import { UploadModule } from '@/modules/upload/upload.module'
import { AuthRepo } from '@/modules/auth/auth.repo'
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
    UserSubscriptionModule,
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
  providers: [
    AuthService,
    AuthRepo,
    GoogleService,
    OtpService,
    RefreshTokenCleanupCronjob
  ]
})
export class AuthModule {}
