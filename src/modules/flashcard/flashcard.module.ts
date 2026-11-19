import { Module } from '@nestjs/common'
import { FlashcardController } from './flashcard.controller'
import { FlashcardService } from './flashcard.service'
import { FlashcardRepo } from './flashcard.repo'
import { SrsReviewModule } from '@/modules/user-srs-review/user-srs-review.module'
import { TranslationModule } from '@/modules/translation/translation.module'

@Module({
  imports: [SrsReviewModule, TranslationModule],
  controllers: [FlashcardController],
  providers: [FlashcardService, FlashcardRepo],
  exports: [FlashcardService, FlashcardRepo]
})
export class FlashcardModule {}
