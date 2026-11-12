import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TestSetController } from './testset.controller'
import { TestSetService } from './testset.service'
import { TestSetRepo } from './testset.repo'
import { QuestionBankModule } from '../question-bank/question-bank.module'
import { UploadModule } from '@/3rdService/upload/upload.module'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'

@Module({
  imports: [ConfigModule, UploadModule, QuestionBankModule],
  controllers: [TestSetController],
  // PrismaService comes from the global SharedModule (was a second client here)
  providers: [TestSetService, TestSetRepo, TextToSpeechService],
  exports: [TestSetService, TestSetRepo]
})
export class TestSetModule {}
