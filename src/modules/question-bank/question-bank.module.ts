import { Module } from '@nestjs/common'
import { QuestionBankController } from './question-bank.controller'
import { QuestionBankRepo } from './question-bank.repo'
import { QuestionBankService } from './question-bank.service'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { UploadModule } from '@/3rdService/upload/upload.module'
import { AnswerModule } from '@/modules/answer/answer.module'

@Module({
  imports: [UploadModule, AnswerModule],
  controllers: [QuestionBankController],
  // PrismaService comes from the global SharedModule (was a second client here)
  providers: [QuestionBankService, QuestionBankRepo, TextToSpeechService],
  exports: [QuestionBankService, QuestionBankRepo]
})
export class QuestionBankModule {}
