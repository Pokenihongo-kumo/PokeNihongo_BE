import { Module } from '@nestjs/common'
import { KanjiController } from './kanji.controller'
import { KanjiService } from './kanji.service'
import { KanjiRepo } from './kanji.repo'
import { SharedModule } from '@/shared/shared.module'
import { KanjiReadingModule } from '@/modules/kanji-reading/kanji-reading.module'
import { TranslationModule } from '@/modules/translation/translation.module'
import { LanguagesModule } from '@/modules/languages/languages.module'
import { UploadModule } from '@/3rdService/upload/upload.module'

@Module({
  imports: [
    SharedModule,
    KanjiReadingModule,
    TranslationModule,
    LanguagesModule,
    UploadModule
  ],
  controllers: [KanjiController],
  providers: [KanjiService, KanjiRepo],
  exports: [KanjiService, KanjiRepo]
})
export class KanjiModule {}
