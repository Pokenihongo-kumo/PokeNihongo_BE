import { Module } from '@nestjs/common'
import { TranslationController } from './translation.controller'
import { TranslationService } from './translation.service'
import { TranslationRepo } from './translation.repo'
import { TranslationHelperService } from './translation.helper.service'
import { LanguagesModule } from '@/modules/languages/languages.module'

@Module({
  imports: [LanguagesModule],
  controllers: [TranslationController],
  providers: [TranslationService, TranslationRepo, TranslationHelperService],
  exports: [TranslationService, TranslationRepo, TranslationHelperService]
})
export class TranslationModule {}
