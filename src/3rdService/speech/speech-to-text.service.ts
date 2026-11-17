import { SpeechToText } from '@/infrastructure/integrations/speech/speech-to-text.port'
import { Injectable, Logger } from '@nestjs/common'
import {
  SPEECH_CONFIG,
  validateAudioFormat,
  validateLanguageCode,
  validateEncoding,
  validateModel,
  validateSampleRate
} from './config/speech.config'

export interface SpeechToTextResult {
  transcript: string
  confidence: number
  languageCode: string
}

export interface SpeechToTextOptions {
  languageCode?: string
  sampleRateHertz?: number
  encoding?:
    | 'LINEAR16'
    | 'FLAC'
    | 'MULAW'
    | 'AMR'
    | 'AMR_WB'
    | 'OGG_OPUS'
    | 'SPEEX_WITH_HEADER_BYTE'
  enableAutomaticPunctuation?: boolean
  enableWordTimeOffsets?: boolean
  model?:
    | 'default'
    | 'latest_long'
    | 'latest_short'
    | 'phone_call'
    | 'video'
    | 'command_and_search'
  // Optional phrase biasing; if omitted, no hints are applied
  speechContexts?: Array<{ phrases: string[]; boost?: number }>
}

// Recognition rules (defaults, validation, messages); the provider call goes
// through the SpeechToText port (integration-ports plan I4)
@Injectable()
export class SpeechToTextService {
  private readonly logger = new Logger(SpeechToTextService.name)

  constructor(private readonly speechToText: SpeechToText) {}

  /**
   * Convert audio to text using Google Cloud Speech-to-Text
   */
  async convertAudioToText(
    audioBuffer: Buffer,
    options: SpeechToTextOptions = {}
  ): Promise<SpeechToTextResult> {
    if (!this.speechToText.isAvailable()) {
      throw new Error(
        'Speech-to-Text client not initialized. Please check Google Cloud credentials in .env'
      )
    }

    try {
      const startTime = Date.now()

      // Validate inputs
      const encoding = options.encoding || SPEECH_CONFIG.DEFAULT_ENCODING
      const sampleRate = options.sampleRateHertz || SPEECH_CONFIG.DEFAULT_SAMPLE_RATE
      const languageCode = options.languageCode || SPEECH_CONFIG.DEFAULT_LANGUAGE_CODE
      const model = options.model || SPEECH_CONFIG.DEFAULT_MODEL

      if (!validateEncoding(encoding)) {
        throw new Error(SPEECH_CONFIG.ERROR_MESSAGES.UNSUPPORTED_ENCODING)
      }
      if (!validateSampleRate(sampleRate)) {
        throw new Error('Sample rate không được hỗ trợ')
      }
      if (!validateLanguageCode(languageCode)) {
        throw new Error(SPEECH_CONFIG.ERROR_MESSAGES.UNSUPPORTED_LANGUAGE)
      }
      if (!validateModel(model)) {
        throw new Error(SPEECH_CONFIG.ERROR_MESSAGES.UNSUPPORTED_MODEL)
      }

      // Default configuration
      const config: any = {
        encoding,
        sampleRateHertz: sampleRate,
        languageCode,
        enableAutomaticPunctuation:
          options.enableAutomaticPunctuation ?? SPEECH_CONFIG.DEFAULT_ENABLE_PUNCTUATION,
        enableWordTimeOffsets:
          options.enableWordTimeOffsets ?? SPEECH_CONFIG.DEFAULT_ENABLE_WORD_TIME_OFFSETS,
        // Prefer the latest_short model for short utterances typical in kaiwa
        model: options.model || 'latest_short'
      }

      // Only apply caller-provided speechContexts (optional)
      if (options.speechContexts && options.speechContexts.length > 0) {
        config.speechContexts = options.speechContexts
      }

      this.logger.log(
        `Starting speech recognition with config: ${JSON.stringify(config)}`
      )

      const recognized = await this.speechToText.recognize({ audio: audioBuffer, config })
      if (!recognized) {
        throw new Error(SPEECH_CONFIG.ERROR_MESSAGES.NO_SPEECH_RESULTS)
      }

      const processingTime = Date.now() - startTime
      this.logger.log(`Speech recognition completed in ${processingTime}ms`)

      return {
        transcript: recognized.transcript,
        confidence: recognized.confidence,
        languageCode: config.languageCode
      }
    } catch (error) {
      this.logger.error('Speech-to-Text conversion failed:', error)
      throw new Error(
        `${SPEECH_CONFIG.ERROR_MESSAGES.SPEECH_RECOGNITION_FAILED}: ${error.message}`
      )
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<string[]> {
    return SPEECH_CONFIG.SUPPORTED_LANGUAGES
  }

  /**
   * Validate audio format
   */
  validateAudioFormat(audioBuffer: Buffer, expectedEncoding: string): boolean {
    return validateAudioFormat(audioBuffer, expectedEncoding)
  }
}
