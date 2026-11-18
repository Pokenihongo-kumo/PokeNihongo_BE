import { UserCoreModule } from '@/modules/user/user-core.module'
import { LanguagesModule } from '@/modules/languages/languages.module'
import { Module } from '@nestjs/common'
import { LeaderboardSeasonModule } from '../leaderboard-season/leaderboard-season.module'
import { RewardModule } from '../reward/reward.module'
import { SeasonRankRewardModule } from '../season-rank-reward/season-rank-reward.module'
import { UserSeasonHistoryController } from './user-season-history.controller'
import { UserSeasonHistoryRepo } from './user-season-history.repo'
import { UserSeasonHistoryService } from './user-season-history.service'

@Module({
  imports: [
    UserCoreModule,
    LanguagesModule,
    LeaderboardSeasonModule,
    RewardModule,
    SeasonRankRewardModule
  ],
  controllers: [UserSeasonHistoryController],
  providers: [UserSeasonHistoryService, UserSeasonHistoryRepo],
  exports: [UserSeasonHistoryService, UserSeasonHistoryRepo]
})
export class UserSeasonHistoryModule {}
