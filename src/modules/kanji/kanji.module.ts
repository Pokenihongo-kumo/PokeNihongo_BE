import { KanjiImportService } from './kanji-import.service'
import { Module } from '@nestjs/common'
import { KanjiController } from './kanji.controller'
import { KanjiService } from './kanji.service'
import { KanjiRepo } from './kanji.repo'
import { SharedModule } from '@/shared/shared.module'
import { KanjiReadingModule } from '@/modules/kanji-reading/kanji-reading.module'
import { UploadModule } from '@/modules/upload/upload.module'

@Module({
  imports: [SharedModule, KanjiReadingModule, UploadModule],
  controllers: [KanjiController],
  providers: [KanjiImportService, KanjiService, KanjiRepo],
  exports: [KanjiService, KanjiRepo]
})
export class KanjiModule {}
