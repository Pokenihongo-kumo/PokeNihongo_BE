import { HandleMatchmakingCronjob } from './handle-matchmaking.cronjob'
import { UserCoreModule } from '@/modules/user/user-core.module'
import { Module } from '@nestjs/common'
import { WebsocketsModule } from '@/websockets/websockets.module'
import { LeaderboardSeasonModule } from '../leaderboard-season/leaderboard-season.module'
import { MatchParticipantModule } from '../match-participant/match-participant.module'
import { MatchModule } from '../match/match.module'
import { UserPokemonModule } from '../user-pokemon/user-pokemon.module'
import { MatchQueueController } from './match-queue.controller'
import { MatchQueueRepo } from './match-queue.repo'
import { MatchQueueService } from './match-queue.service'

@Module({
  imports: [
    UserCoreModule,
    UserPokemonModule,

    MatchModule,
    MatchParticipantModule,
    LeaderboardSeasonModule,
    WebsocketsModule
  ],
  controllers: [MatchQueueController],
  // the 5 s matchmaking cron runs the queue it lives with
  providers: [MatchQueueService, MatchQueueRepo, HandleMatchmakingCronjob],
  exports: [MatchQueueService, MatchQueueRepo]
})
export class MatchQueueModule {}
