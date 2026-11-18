import { MailModule } from '@/3rdService/mail/mail.module'
import { LanguagesModule } from '@/modules/languages/languages.module'
import { Module } from '@nestjs/common'
import { SubscriptionPlanModule } from '../subscription-plan/subscription-plan.module'
import { HandleUserSubscriptionCronjob } from './handle-user-subscription.cronjob'
import { UserSubscriptionController } from './user-subscription.controller'
import { UserSubscriptionRepo } from './user-subscription.repo'
import { UserSubscriptionService } from './user-subscription.service'

@Module({
  imports: [LanguagesModule, SubscriptionPlanModule, MailModule],
  controllers: [UserSubscriptionController],
  // the expiry cron (every hour, UTC) lives with the table it updates
  providers: [
    UserSubscriptionService,
    UserSubscriptionRepo,
    HandleUserSubscriptionCronjob
  ],
  exports: [UserSubscriptionService, UserSubscriptionRepo]
})
export class UserSubscriptionModule {}
