import { Injectable, Logger } from '@nestjs/common'
import {
  RecognizedSpeech,
  RecognizeSpeechInput,
  SpeechToText
} from './speech-to-text.port'
import { SynthesizeSpeechInput, TextToSpeech, VoiceInfo } from './text-to-speech.port'

// SPEECH_DRIVER=fake: no provider, no key, deterministic. Tests and local demo
// only; the config refuses it in production.

export const FAKE_TRANSCRIPT = 'こんにちは'

@Injectable()
export class FakeSpeechToText extends SpeechToText {
  private readonly logger = new Logger(FakeSpeechToText.name)

  isAvailable(): boolean {
    return true
  }

  async recognize({ audio }: RecognizeSpeechInput): Promise<RecognizedSpeech | null> {
    this.logger.log(`Speech not recognized (SPEECH_DRIVER=fake): ${audio.length} bytes`)
    return audio.length > 0 ? { transcript: FAKE_TRANSCRIPT, confidence: 1 } : null
  }
}

// 0.1 s of silence as a WAV file, whatever encoding was asked for
const silence = (() => {
  const sampleRate = 8000
  const samples = sampleRate / 10
  const buffer = Buffer.alloc(44 + samples)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + samples, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate, 28)
  buffer.writeUInt16LE(1, 32)
  buffer.writeUInt16LE(8, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples, 40)
  buffer.fill(128, 44) // 8-bit silence
  return buffer
})()

@Injectable()
export class FakeTextToSpeech extends TextToSpeech {
  private readonly logger = new Logger(FakeTextToSpeech.name)

  isAvailable(): boolean {
    return true
  }

  async synthesize(input: SynthesizeSpeechInput): Promise<Buffer> {
    this.logger.log(
      `Speech not synthesized (SPEECH_DRIVER=fake): ${input.text.length} chars`
    )
    return Buffer.from(silence)
  }

  async listVoices(languageCode: string): Promise<VoiceInfo[]> {
    return [
      {
        name: `${languageCode}-Fake-A`,
        ssmlGender: 'FEMALE',
        naturalSampleRateHertz: 24000,
        languageCodes: [languageCode]
      },
      {
        name: `${languageCode}-Fake-B`,
        ssmlGender: 'MALE',
        naturalSampleRateHertz: 24000,
        languageCodes: [languageCode]
      }
    ]
  }
}
