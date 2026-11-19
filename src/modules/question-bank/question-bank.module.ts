import { Module } from '@nestjs/common'
import { QuestionBankController } from './question-bank.controller'
import { QuestionBankRepo } from './question-bank.repo'
import { QuestionBankService } from './question-bank.service'
import { SpeechModule } from '@/modules/speech/speech.module'
import { UploadModule } from '@/modules/upload/upload.module'
import { AnswerModule } from '@/modules/answer/answer.module'

@Module({
  imports: [SpeechModule, UploadModule, AnswerModule],
  controllers: [QuestionBankController],
  // PrismaService comes from the global SharedModule (was a second client here)
  providers: [QuestionBankService, QuestionBankRepo],
  exports: [QuestionBankService, QuestionBankRepo]
})
export class QuestionBankModule {}
