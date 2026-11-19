import { Module } from '@nestjs/common'
import { KanjiReadingController } from './kanji-reading.controller'
import { KanjiReadingService } from './kanji-reading.service'
import { KanjiReadingRepo } from './kanji-reading.repo'
import { SharedModule } from '@/shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [KanjiReadingController],
  providers: [KanjiReadingService, KanjiReadingRepo],
  exports: [KanjiReadingService, KanjiReadingRepo]
})
export class KanjiReadingModule {}
