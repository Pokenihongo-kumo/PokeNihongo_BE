import { UserCoreModule } from '@/modules/user/user-core.module'
import { BullQueueModule } from '@/3rdService/bull/bull-queue.module'
import { MailModule } from '@/3rdService/mail/mail.module'
import { BullQueue } from '@/common/constants/bull-action.constant'
import { LevelRepo } from '@/modules/level/level.repo'
import { UserPokemonRepo } from '@/modules/user-pokemon/user-pokemon.repo'
import { SharedModule } from '@/shared/shared.module'
import { SharedUserDeletionProcessor } from '@/shared/workers/user-deletion.processor'
import { forwardRef, Module } from '@nestjs/common'
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
    SharedModule,
    BullQueueModule.registerQueue(BullQueue.USER_DELETION),
    MailModule,
    forwardRef(() => WalletModule),
    LeaderboardSeasonModule,
    MatchModule,
    UserSeasonHistoryModule,
    LanguagesModule,
    UserProgressModule
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepo,
    UserPokemonRepo,
    LevelRepo,
    SharedUserDeletionProcessor
  ],
  exports: [UserService, UserRepo]
})
export class UserModule {}
