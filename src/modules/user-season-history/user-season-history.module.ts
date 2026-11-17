import { LanguagesModule } from '@/modules/languages/languages.module'
import { Module, forwardRef } from '@nestjs/common'
import { LeaderboardSeasonModule } from '../leaderboard-season/leaderboard-season.module'
import { RewardModule } from '../reward/reward.module'
import { UserSeasonHistoryController } from './user-season-history.controller'
import { UserSeasonHistoryRepo } from './user-season-history.repo'
import { UserSeasonHistoryService } from './user-season-history.service'

@Module({
  imports: [LanguagesModule, LeaderboardSeasonModule, forwardRef(() => RewardModule)],
  controllers: [UserSeasonHistoryController],
  providers: [UserSeasonHistoryService, UserSeasonHistoryRepo],
  exports: [UserSeasonHistoryService, UserSeasonHistoryRepo]
})
export class UserSeasonHistoryModule {}
