import { Module } from '@nestjs/common'
import { TranslationController } from './translation.controller'
import { TranslationService } from './translation.service'
import { TranslationRepository } from './translation.repo'
import { TranslationHelperService } from './translation.helper.service'
import { LanguagesModule } from '@/modules/languages/languages.module'

@Module({
  imports: [LanguagesModule],
  controllers: [TranslationController],
  providers: [TranslationService, TranslationRepository, TranslationHelperService],
  exports: [TranslationService, TranslationRepository, TranslationHelperService]
})
export class TranslationModule {}
