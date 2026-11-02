import { Module } from '@nestjs/common'
import { QuestionBankController } from './question-bank.controller'
import { QuestionBankRepository } from './question-bank.repo'
import { QuestionBankService } from './question-bank.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { UploadModule } from '@/3rdService/upload/upload.module'
import { TranslationModule } from '@/modules/translation/translation.module'
import { LanguagesModule } from '@/modules/languages/languages.module'
import { AnswerModule } from '@/modules/answer/answer.module'

@Module({
  imports: [UploadModule, TranslationModule, LanguagesModule, AnswerModule],
  controllers: [QuestionBankController],
  providers: [
    QuestionBankService,
    QuestionBankRepository,
    PrismaService,
    TextToSpeechService
  ],
  exports: [QuestionBankService, QuestionBankRepository]
})
export class QuestionBankModule {}
