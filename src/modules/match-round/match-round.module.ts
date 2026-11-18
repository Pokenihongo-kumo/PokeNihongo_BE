import { QuestionBankModule } from '@/modules/question-bank/question-bank.module'
import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { LeaderboardSeasonModule } from '../leaderboard-season/leaderboard-season.module'
import { MatchModule } from '../match/match.module'
import { RoundQuestionModule } from '../round-question/round-question.module'
import { MatchRoundController } from './match-round.controller'
import { MatchRoundRepo } from './match-round.repo'
import { MatchRoundService } from './match-round.service'

@Module({
  imports: [
    MatchModule,
    LanguagesModule,
    LeaderboardSeasonModule,
    RoundQuestionModule,
    QuestionBankModule
  ],
  controllers: [MatchRoundController],
  providers: [MatchRoundService, MatchRoundRepo],
  exports: [MatchRoundService, MatchRoundRepo]
})
export class MatchRoundModule {}
