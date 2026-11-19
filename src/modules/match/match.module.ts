import { QuestionBankModule } from '@/modules/question-bank/question-bank.module'
import { forwardRef, Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { LeaderboardSeasonModule } from '../leaderboard-season/leaderboard-season.module'
import { MatchController } from './match.controller'
import { MatchRepo } from './match.repo'
import { MatchService } from './match.service'

@Module({
  imports: [
    forwardRef(() => LeaderboardSeasonModule),
    LanguagesModule,
    QuestionBankModule
  ],
  controllers: [MatchController],
  providers: [MatchService, MatchRepo],
  exports: [MatchService, MatchRepo]
})
export class MatchModule {}
