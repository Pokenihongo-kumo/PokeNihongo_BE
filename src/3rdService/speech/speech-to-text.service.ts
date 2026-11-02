import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SpeechClient } from '@google-cloud/speech'
import {
  createSpeechClient,
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

@Injectable()
export class SpeechToTextService {
  private readonly logger = new Logger(SpeechToTextService.name)
  private speechClient: SpeechClient | null

  constructor(private readonly configService: ConfigService) {
    try {
      this.speechClient = createSpeechClient(this.configService)
      this.logger.log('Google Cloud Speech-to-Text client initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize Google Cloud Speech client:', error)
      this.logger.warn(
        'Speech-to-Text service will not be available. Please check GOOGLE_CLOUD_CLIENT_EMAIL, GOOGLE_CLOUD_PRIVATE_KEY, and GOOGLE_CLOUD_PROJECT_ID in .env'
      )
      // Don't throw error - allow service to be created but mark client as null
      this.speechClient = null
    }
  }

  /**
   * Convert audio to text using Google Cloud Speech-to-Text
   */
  async convertAudioToText(
    audioBuffer: Buffer,
    options: SpeechToTextOptions = {}
  ): Promise<SpeechToTextResult> {
    if (!this.speechClient) {
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

      const audio = {
        content: audioBuffer.toString('base64')
      }

      const request = {
        config,
        audio
      }

      this.logger.log(
        `Starting speech recognition with config: ${JSON.stringify(config)}`
      )

      const [response] = await this.speechClient.recognize(request)
      const results = response.results

      if (!results || results.length === 0) {
        throw new Error(SPEECH_CONFIG.ERROR_MESSAGES.NO_SPEECH_RESULTS)
      }

      const result = results[0]
      const alternative = result.alternatives?.[0]

      if (!alternative) {
        throw new Error(SPEECH_CONFIG.ERROR_MESSAGES.NO_SPEECH_RESULTS)
      }

      const processingTime = Date.now() - startTime
      this.logger.log(`Speech recognition completed in ${processingTime}ms`)

      return {
        transcript: alternative.transcript || '',
        confidence: alternative.confidence || 0,
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
   * Convert audio to text with streaming (for real-time processing)
   */
  async convertAudioToTextStreaming(
    audioStream: NodeJS.ReadableStream,
    options: SpeechToTextOptions = {}
  ): Promise<SpeechToTextResult> {
    if (!this.speechClient) {
      throw new Error(
        'Speech-to-Text client not initialized. Please check Google Cloud credentials in .env'
      )
    }

    return new Promise((resolve, reject) => {
      if (!this.speechClient) {
        reject(
          new Error(
            'Speech-to-Text client not initialized. Please check Google Cloud credentials in .env'
          )
        )
        return
      }

      try {
        const config = {
          encoding: options.encoding || 'LINEAR16',
          sampleRateHertz: options.sampleRateHertz || 16000,
          languageCode: options.languageCode || 'ja-JP',
          enableAutomaticPunctuation: options.enableAutomaticPunctuation ?? true,
          model: options.model || 'default'
        }

        const recognizeStream = this.speechClient
          .streamingRecognize({
            config,
            interimResults: false // Set to true for real-time results
          })
          .on('error', (error) => {
            this.logger.error('Streaming recognition error:', error)
            reject(error)
          })
          .on('data', (data) => {
            const result = data.results?.[0]
            const alternative = result?.alternatives?.[0]

            if (alternative) {
              resolve({
                transcript: alternative.transcript || '',
                confidence: alternative.confidence || 0,
                languageCode: config.languageCode
              })
            }
          })

        audioStream.pipe(recognizeStream)
      } catch (error) {
        this.logger.error('Streaming speech recognition failed:', error)
        reject(error)
      }
    })
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
