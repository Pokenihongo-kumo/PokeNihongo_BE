import { Module } from '@nestjs/common'
import { GrammarController } from './grammar.controller'
import { GrammarService } from './grammar.service'
import { GrammarRepository } from './grammar.repo'
import { GrammarUsageModule } from '../grammar-usage/grammar-usage.module'
import { TranslationModule } from '../translation/translation.module'
import { LanguagesModule } from '../languages/languages.module'

@Module({
  imports: [GrammarUsageModule, TranslationModule, LanguagesModule],
  controllers: [GrammarController],
  providers: [GrammarService, GrammarRepository],
  exports: [GrammarService, GrammarRepository]
})
export class GrammarModule {}
