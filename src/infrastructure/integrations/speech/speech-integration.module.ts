import envConfig from '@/config/env.config'
import { Module } from '@nestjs/common'
import { FakeSpeechToText, FakeTextToSpeech } from './fake-speech.adapters'
import { GoogleSpeechToText, GoogleTextToSpeech } from './google-speech.adapters'
import { SpeechToText } from './speech-to-text.port'
import { TextToSpeech } from './text-to-speech.port'

const google = envConfig.SPEECH_DRIVER === 'google'

// Provides the SpeechToText and TextToSpeech ports; with SPEECH_DRIVER=fake no
// Google client is created
@Module({
  providers: [
    { provide: SpeechToText, useClass: google ? GoogleSpeechToText : FakeSpeechToText },
    { provide: TextToSpeech, useClass: google ? GoogleTextToSpeech : FakeTextToSpeech }
  ],
  exports: [SpeechToText, TextToSpeech]
})
export class SpeechIntegrationModule {}
