import { Module } from '@nestjs/common'
import { SrsReviewService } from './srs-review.service'
import { SrsReviewController } from './srs-review.controller'
import { SharedModule } from '@/shared/shared.module'
import { SrsReviewRepository } from './srs-review.repo'
import { TranslationModule } from '@/modules/translation/translation.module'

@Module({
  imports: [SharedModule, TranslationModule],
  controllers: [SrsReviewController],
  providers: [SrsReviewService, SrsReviewRepository],
  exports: [SrsReviewService, SrsReviewRepository]
})
export class SrsReviewModule {}
