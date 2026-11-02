import { Module } from '@nestjs/common'
import { WordTypeController } from './wordtype.controller'
import { WordTypeService } from './wordtype.service'
import { WordTypeRepository } from './wordtype.repo'
import { SharedModule } from '@/shared/shared.module'
import { TranslationModule } from '@/modules/translation/translation.module'
import { LanguagesModule } from '@/modules/languages/languages.module'

@Module({
  imports: [SharedModule, TranslationModule, LanguagesModule],
  controllers: [WordTypeController],
  providers: [WordTypeService, WordTypeRepository],
  exports: [WordTypeService, WordTypeRepository]
})
export class WordTypeModule {}
