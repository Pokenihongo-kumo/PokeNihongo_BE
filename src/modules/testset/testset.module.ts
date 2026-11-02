import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TestSetController } from './testset.controller'
import { TestSetService } from './testset.service'
import { TestSetRepository } from './testset.repo'
import { PrismaService } from '@/shared/services/prisma.service'
import { TranslationModule } from '../translation/translation.module'
import { LanguagesModule } from '../languages/languages.module'
import { QuestionBankModule } from '../question-bank/question-bank.module'
import { UploadModule } from '@/3rdService/upload/upload.module'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'

@Module({
  imports: [
    ConfigModule,
    UploadModule,
    TranslationModule,
    LanguagesModule,
    QuestionBankModule
  ],
  controllers: [TestSetController],
  providers: [TestSetService, TestSetRepository, PrismaService, TextToSpeechService],
  exports: [TestSetService, TestSetRepository]
})
export class TestSetModule {}
