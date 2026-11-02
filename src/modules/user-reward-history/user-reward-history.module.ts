import { Module, forwardRef } from '@nestjs/common'
import { UserRewardHistoryController } from './user-reward-history.controller'
import { UserRewardHistoryService } from './user-reward-history.service'
import { UserRewardHistoryRepository } from './user-reward-history.repo'
import { RewardModule } from '../reward/reward.module'
import { TranslationModule } from '../translation/translation.module'
import { LanguagesModule } from '../languages/languages.module'

@Module({
  imports: [forwardRef(() => RewardModule), TranslationModule, LanguagesModule],
  controllers: [UserRewardHistoryController],
  providers: [UserRewardHistoryService, UserRewardHistoryRepository],
  exports: [UserRewardHistoryService, UserRewardHistoryRepository]
})
export class UserRewardHistoryModule {}
