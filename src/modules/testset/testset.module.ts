import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TestSetController } from './testset.controller'
import { TestSetService } from './testset.service'
import { TestSetRepo } from './testset.repo'
import { QuestionBankModule } from '../question-bank/question-bank.module'
import { UploadModule } from '@/modules/upload/upload.module'
import { SpeechModule } from '@/modules/speech/speech.module'

@Module({
  imports: [ConfigModule, SpeechModule, UploadModule, QuestionBankModule],
  controllers: [TestSetController],
  // PrismaService comes from the global SharedModule (was a second client here)
  providers: [TestSetService, TestSetRepo],
  exports: [TestSetService, TestSetRepo]
})
export class TestSetModule {}
