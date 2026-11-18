import { BullQueueModule } from '@/3rdService/bull/bull-queue.module'
import { BullQueue } from '@/common/constants/bull-action.constant'
import { MatchParticipantTimeoutProcessor } from '@/modules/match-participant/match-participant-timeout.processor'
import { WebsocketsModule } from '@/websockets/websockets.module'
import { forwardRef, Module } from '@nestjs/common'
import { MatchRoundParticipantModule } from '../match-round-participant/match-round-participant.module'
import { MatchRoundModule } from '../match-round/match-round.module'
import { MatchModule } from '../match/match.module'
import { MatchParticipantController } from './match-participant.controller'
import { MatchParticipantRepo } from './match-participant.repo'
import { MatchParticipantService } from './match-participant.service'

@Module({
  imports: [
    BullQueueModule.registerQueue(
      BullQueue.MATCH_PARTICIPANT_TIMEOUT,
      {},
      true // Sử dụng Redis riêng cho match
    ),
    WebsocketsModule,
    MatchModule,
    forwardRef(() => MatchRoundModule),
    forwardRef(() => MatchRoundParticipantModule)
  ],
  controllers: [MatchParticipantController],
  providers: [
    MatchParticipantService,
    MatchParticipantRepo,
    MatchParticipantTimeoutProcessor
  ],
  exports: [MatchParticipantService, MatchParticipantRepo]
})
export class MatchParticipantModule {}
