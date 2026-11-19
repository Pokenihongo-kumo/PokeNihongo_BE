import { Module } from '@nestjs/common'
import { SrsReviewService } from './user-srs-review.service'
import { SrsReviewController } from './user-srs-review.controller'
import { SharedModule } from '@/shared/shared.module'
import { SrsReviewRepo } from './user-srs-review.repo'
import { TranslationModule } from '@/modules/translation/translation.module'

@Module({
  imports: [SharedModule, TranslationModule],
  controllers: [SrsReviewController],
  providers: [SrsReviewService, SrsReviewRepo],
  exports: [SrsReviewService, SrsReviewRepo]
})
export class SrsReviewModule {}
