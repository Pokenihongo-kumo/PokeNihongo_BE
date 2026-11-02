import { Module } from '@nestjs/common'
import { SpeechToTextService } from './speech-to-text.service'
import { TextToSpeechService } from './text-to-speech.service'
import { SpeechController } from './speech.controller'
import { UploadModule } from '../upload/upload.module'
import { RedisModule } from '../redis/redis.module'

@Module({
  imports: [UploadModule, RedisModule],
  controllers: [SpeechController],
  providers: [SpeechToTextService, TextToSpeechService],
  exports: [SpeechToTextService, TextToSpeechService]
})
export class SpeechModule {}
