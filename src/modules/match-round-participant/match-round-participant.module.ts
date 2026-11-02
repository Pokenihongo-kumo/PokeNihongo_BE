import { BullQueueModule } from '@/3rdService/bull/bull-queue.module'
import { BullQueue } from '@/common/constants/bull-action.constant'
import { MatchRoundParticipantTimeoutProcessor } from '@/shared/workers/match-round-participant-timeout.processor'
import { WebsocketsModule } from '@/websockets/websockets.module'
import { forwardRef, Module } from '@nestjs/common'
import { MatchRoundModule } from '../match-round/match-round.module'
import { MatchModule } from '../match/match.module'
import { QuestionBankModule } from '../question-bank/question-bank.module'
import { RoundQuestionModule } from '../round-question/round-question.module'
import { UserPokemonModule } from '../user-pokemon/user-pokemon.module'
import { MatchRoundParticipantController } from './match-round-participant.controller'
import { MatchRoundParticipantRepo } from './match-round-participant.repo'
import { MatchRoundParticipantService } from './match-round-participant.service'

@Module({
  imports: [
    BullQueueModule.registerQueue(
      BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT,
      {},
      true // Sử dụng Redis riêng cho match
    ),
    MatchModule,
    forwardRef(() => MatchRoundModule),
    WebsocketsModule,
    UserPokemonModule,
    RoundQuestionModule,
    QuestionBankModule
  ],
  controllers: [MatchRoundParticipantController],
  providers: [
    MatchRoundParticipantService,
    MatchRoundParticipantRepo,
    MatchRoundParticipantTimeoutProcessor
  ],
  exports: [MatchRoundParticipantService, MatchRoundParticipantRepo]
})
export class MatchRoundParticipantModule {}
