import { Module } from '@nestjs/common'
import { FlashcardController } from './flashcard.controller'
import { FlashcardService } from './flashcard.service'
import { FlashcardRepository } from './flashcard.repo'
import { SrsReviewModule } from '@/modules/user-srs-review/user-srs-review.module'
import { TranslationModule } from '@/modules/translation/translation.module'

@Module({
  imports: [SrsReviewModule, TranslationModule],
  controllers: [FlashcardController],
  providers: [FlashcardService, FlashcardRepository],
  exports: [FlashcardService, FlashcardRepository]
})
export class FlashcardModule {}
