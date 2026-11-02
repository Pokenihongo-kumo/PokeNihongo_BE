import { Module } from '@nestjs/common'
import { SpeakingController } from './speaking.controller'
import { SpeakingService } from './speaking.service'
import { SpeakingRepository } from './speaking.repo'
import { PrismaService } from '@/shared/services/prisma.service'
import { SpeechToTextService } from '@/3rdService/speech/speech-to-text.service'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { UploadModule } from '@/3rdService/upload/upload.module'

@Module({
  imports: [UploadModule],
  controllers: [SpeakingController],
  providers: [
    SpeakingService,
    SpeakingRepository,
    PrismaService,
    SpeechToTextService,
    TextToSpeechService
  ],
  exports: [SpeakingService, SpeakingRepository]
})
export class SpeakingModule {}
