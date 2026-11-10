import { Module } from '@nestjs/common'
import { MeaningController } from './meaning.controller'
import { MeaningService } from './meaning.service'
import { MeaningRepo } from './meaning.repo'
import { TranslationModule } from '@/modules/translation/translation.module'

@Module({
  imports: [TranslationModule],
  controllers: [MeaningController],
  providers: [MeaningService, MeaningRepo],
  exports: [MeaningService, MeaningRepo]
})
export class MeaningModule {}
