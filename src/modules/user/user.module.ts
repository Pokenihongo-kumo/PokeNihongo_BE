import { UserCoreModule } from '@/modules/user/user-core.module'
import { BullQueueModule } from '@/3rdService/bull/bull-queue.module'
import { MailModule } from '@/3rdService/mail/mail.module'
import { BullQueue } from '@/common/constants/bull-action.constant'
import { LevelModule } from '@/modules/level/level.module'
import { UserPokemonModule } from '@/modules/user-pokemon/user-pokemon.module'
import { SharedModule } from '@/shared/shared.module'
import { SharedUserDeletionProcessor } from './user-deletion.processor'
import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { LeaderboardSeasonModule } from '../leaderboard-season/leaderboard-season.module'
import { MatchModule } from '../match/match.module'
import { UserProgressModule } from '../user-progress/user-progress.module'
import { UserSeasonHistoryModule } from '../user-season-history/user-season-history.module'
import { WalletModule } from '../wallet/wallet.module'
import { UserController } from './user.controller'
import { UserRepo } from './user.repo'
import { UserService } from './user.service'

@Module({
  imports: [
    UserCoreModule,
    LevelModule,
    UserPokemonModule,
    SharedModule,
    BullQueueModule.registerQueue(BullQueue.USER_DELETION),
    MailModule,
    WalletModule,
    LeaderboardSeasonModule,
    MatchModule,
    UserSeasonHistoryModule,
    LanguagesModule,
    UserProgressModule
  ],
  controllers: [UserController],
  providers: [UserService, UserRepo, SharedUserDeletionProcessor],
  exports: [UserService, UserRepo]
})
export class UserModule {}
