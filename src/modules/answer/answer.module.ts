import { Module } from '@nestjs/common'
import { AnswerController } from './answer.controller'
import { AnswerService } from './answer.service'
import { AnswerRepo } from './answer.repo'
import { SharedModule } from '@/shared/shared.module'
import { TranslationModule } from '@/modules/translation/translation.module'
import { LanguagesModule } from '@/modules/languages/languages.module'

@Module({
  imports: [SharedModule, TranslationModule, LanguagesModule],
  controllers: [AnswerController],
  providers: [AnswerService, AnswerRepo],
  exports: [AnswerService, AnswerRepo]
})
export class AnswerModule {}
