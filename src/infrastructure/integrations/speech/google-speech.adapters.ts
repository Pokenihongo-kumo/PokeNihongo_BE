import { SpeechClient } from '@google-cloud/speech'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { googleClientOptions } from './google-credentials'
import {
  RecognizedSpeech,
  RecognizeSpeechInput,
  SpeechToText
} from './speech-to-text.port'
import { SynthesizeSpeechInput, TextToSpeech, VoiceInfo } from './text-to-speech.port'

// SPEECH_DRIVER=google: Google Cloud Speech-to-Text. Without credentials the
// client stays null and isAvailable() is false, as before.
@Injectable()
export class GoogleSpeechToText extends SpeechToText {
  private readonly logger = new Logger(GoogleSpeechToText.name)
  private readonly client: SpeechClient | null

  constructor(config: ConfigService) {
    super()
    let client: SpeechClient | null = null
    try {
      client = new SpeechClient(googleClientOptions(config))
      this.logger.log('Google Cloud Speech-to-Text client initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize Google Cloud Speech client:', error)
      this.logger.warn(
        'Speech-to-Text service will not be available. Please check GOOGLE_CLOUD_CLIENT_EMAIL, GOOGLE_CLOUD_PRIVATE_KEY, and GOOGLE_CLOUD_PROJECT_ID in .env'
      )
    }
    this.client = client
  }

  isAvailable(): boolean {
    return this.client !== null
  }

  async recognize({
    audio,
    config
  }: RecognizeSpeechInput): Promise<RecognizedSpeech | null> {
    if (!this.client) throw new Error('Speech-to-Text client not initialized')
    const [response] = await this.client.recognize({
      config: config as never,
      audio: { content: audio.toString('base64') }
    })
    const alternative = response.results?.[0]?.alternatives?.[0]
    if (!alternative) return null
    return {
      transcript: alternative.transcript || '',
      confidence: alternative.confidence || 0
    }
  }
}

// SPEECH_DRIVER=google: Google Cloud Text-to-Speech
@Injectable()
export class GoogleTextToSpeech extends TextToSpeech {
  private readonly logger = new Logger(GoogleTextToSpeech.name)
  private readonly client: TextToSpeechClient | null

  constructor(config: ConfigService) {
    super()
    let client: TextToSpeechClient | null = null
    try {
      client = new TextToSpeechClient(googleClientOptions(config))
      this.logger.log('Google Cloud Text-to-Speech client initialized successfully')
    } catch {
      this.logger.warn(
        'Google Cloud credentials not configured, Text-to-Speech service disabled'
      )
    }
    this.client = client
  }

  isAvailable(): boolean {
    return this.client !== null
  }

  async synthesize(input: SynthesizeSpeechInput): Promise<Buffer> {
    if (!this.client) throw new Error('Text-to-Speech client not initialized')
    const [response] = await this.client.synthesizeSpeech({
      input: { text: input.text },
      voice: {
        languageCode: input.languageCode,
        name: input.voiceName,
        ssmlGender: 'NEUTRAL'
      },
      audioConfig: {
        audioEncoding: input.audioEncoding,
        speakingRate: input.speakingRate,
        pitch: input.pitch,
        volumeGainDb: input.volumeGainDb
      }
    })
    if (!response.audioContent) {
      throw new Error('No audio content received from Text-to-Speech service')
    }
    return Buffer.from(response.audioContent)
  }

  async listVoices(languageCode: string): Promise<VoiceInfo[]> {
    if (!this.client) throw new Error('Text-to-Speech client not initialized')
    const [voices] = await this.client.listVoices({ languageCode })
    return (voices.voices || []) as VoiceInfo[]
  }
}
