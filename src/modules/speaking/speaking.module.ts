import { Module } from '@nestjs/common'
import { SpeakingController } from './speaking.controller'
import { SpeakingService } from './speaking.service'
import { SpeakingRepository } from './speaking.repo'
import { PrismaService } from '@/shared/services/prisma.service'
import { SpeechModule } from '@/modules/speech/speech.module'
import { UploadModule } from '@/modules/upload/upload.module'

@Module({
  imports: [SpeechModule, UploadModule],
  controllers: [SpeakingController],
  providers: [SpeakingService, SpeakingRepository, PrismaService],
  exports: [SpeakingService, SpeakingRepository]
})
export class SpeakingModule {}
