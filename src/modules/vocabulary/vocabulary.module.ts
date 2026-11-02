import { Module } from '@nestjs/common'
import { VocabularyController } from './vocabulary.controller'
import { VocabularyRepository } from './vocabulary.repo'
import { VocabularyService } from './vocabulary.service'
import { VocabularyHelperService } from './vocabulary.helper.service'
import { UploadModule } from '@/3rdService/upload/upload.module'
import { SpeechModule } from '@/3rdService/speech/speech.module'
import { KanjiModule } from '@/modules/kanji/kanji.module'
import { MeaningModule } from '@/modules/meaning/meaning.module'
import { TranslationModule } from '@/modules/translation/translation.module'
import { LanguagesModule } from '@/modules/languages/languages.module'
import { WordTypeModule } from '@/modules/wordtype/wordtype.module'

@Module({
  imports: [
    UploadModule,
    SpeechModule,
    KanjiModule,
    MeaningModule,
    TranslationModule,
    LanguagesModule,
    WordTypeModule
  ],
  controllers: [VocabularyController],
  providers: [VocabularyService, VocabularyRepository, VocabularyHelperService],
  exports: [VocabularyService, VocabularyRepository, VocabularyHelperService]
})
export class VocabularyModule {}
