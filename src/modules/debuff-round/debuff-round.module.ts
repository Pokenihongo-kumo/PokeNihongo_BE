import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { TranslationModule } from '../translation/translation.module'
import { DebuffRoundController } from './debuff-round.controller'
import { DebuffRoundRepo } from './debuff-round.repo'
import { DebuffRoundService } from './debuff-round.service'

@Module({
  imports: [LanguagesModule, TranslationModule],
  controllers: [DebuffRoundController],
  providers: [DebuffRoundService, DebuffRoundRepo],
  exports: [DebuffRoundService]
})
export class DebuffRoundModule {}
