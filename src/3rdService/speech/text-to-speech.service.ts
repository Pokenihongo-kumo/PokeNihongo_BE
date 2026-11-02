import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { UploadService } from '../upload/upload.service'

export interface TextToSpeechResult {
  audioContent: Buffer
  audioConfig: {
    audioEncoding: string
    sampleRateHertz: number
  }
}

export interface TextToSpeechOptions {
  languageCode?: string
  voiceName?: string
  audioEncoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS'
  speakingRate?: number
  pitch?: number
  volumeGainDb?: number
}

@Injectable()
export class TextToSpeechService {
  private readonly logger = new Logger(TextToSpeechService.name)
  private textToSpeechClient: TextToSpeechClient | null

  constructor(
    private readonly configService: ConfigService,
    private readonly uploadService: UploadService
  ) {
    // Check if credentials are available before initializing
    const clientEmail = this.configService.get('GOOGLE_CLOUD_CLIENT_EMAIL')
    const privateKey = this.configService.get('GOOGLE_CLOUD_PRIVATE_KEY')
    const projectId = this.configService.get('GOOGLE_CLOUD_PROJECT_ID')

    if (!clientEmail || !privateKey || !projectId) {
      this.logger.warn(
        'Google Cloud credentials not configured, Text-to-Speech service disabled'
      )
      this.textToSpeechClient = null
      return
    }

    try {
      this.textToSpeechClient = new TextToSpeechClient({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n')
        },
        projectId: projectId
      })
      this.logger.log('Google Cloud Text-to-Speech client initialized successfully')
    } catch (error) {
      this.logger.warn('Google Cloud Text-to-Speech client not available:', error.message)
      this.textToSpeechClient = null
    }
  }

  /**
   * Convert text to speech using Google Cloud Text-to-Speech
   */
  async convertTextToSpeech(
    text: string,
    options: TextToSpeechOptions = {}
  ): Promise<TextToSpeechResult> {
    try {
      // Check if client is available
      if (!this.textToSpeechClient) {
        throw new Error(
          'Text-to-Speech client not initialized. Please check Google Cloud credentials.'
        )
      }

      const startTime = Date.now()

      // Default configuration for Japanese
      const request = {
        input: { text },
        voice: {
          languageCode: options.languageCode || 'ja-JP',
          name: options.voiceName || 'ja-JP-Wavenet-A',
          ssmlGender: 'NEUTRAL' as const
        },
        audioConfig: {
          audioEncoding: options.audioEncoding || 'MP3',
          speakingRate: options.speakingRate || 1.0,
          pitch: options.pitch || 0.0,
          volumeGainDb: options.volumeGainDb || 0.0
        }
      }

      this.logger.log(
        `Converting text to speech: "${text}" with config: ${JSON.stringify(request.voice)}`
      )

      const [response] = await this.textToSpeechClient.synthesizeSpeech(request)

      if (!response.audioContent) {
        throw new Error('No audio content received from Text-to-Speech service')
      }

      const processingTime = Date.now() - startTime
      this.logger.log(`Text-to-Speech conversion completed in ${processingTime}ms`)

      return {
        audioContent: Buffer.from(response.audioContent),
        audioConfig: {
          audioEncoding: request.audioConfig.audioEncoding,
          sampleRateHertz: 24000
        }
      }
    } catch (error) {
      this.logger.error('Text-to-Speech conversion failed:', error)
      throw new Error(`Text-to-Speech conversion failed: ${error.message}`)
    }
  }

  /**
   * Get supported voices for a language
   */
  async getSupportedVoices(languageCode: string = 'ja-JP'): Promise<any[]> {
    try {
      if (!this.textToSpeechClient) {
        throw new Error('Text-to-Speech client not initialized')
      }

      const [voices] = await this.textToSpeechClient.listVoices({
        languageCode
      })
      return voices.voices || []
    } catch (error) {
      this.logger.error('Failed to get supported voices:', error)
      throw new Error(`Failed to get supported voices: ${error.message}`)
    }
  }

  /**
   * Get Japanese voice models list (formatted)
   */
  async getJapaneseVoices(): Promise<
    Array<{ name: string; ssmlGender: string; naturalSampleRateHertz: number }>
  > {
    try {
      const voices = await this.getSupportedVoices('ja-JP')

      // Format và filter chỉ lấy thông tin cần thiết
      const formattedVoices = voices.map((voice: any) => ({
        name: voice.name,
        ssmlGender: voice.ssmlGender,
        naturalSampleRateHertz: voice.naturalSampleRateHertz
      }))

      this.logger.log(`Found ${formattedVoices.length} Japanese voice models`)
      return formattedVoices
    } catch (error) {
      this.logger.error('Failed to get Japanese voices:', error)
      throw new Error(`Failed to get Japanese voices: ${error.message}`)
    }
  }

  /**
   * Generate audio from text and upload to Cloudinary
   * @param text Text to convert to speech
   * @param folder Folder to upload audio to
   * @param prefix Prefix for the filename
   * @returns Promise<string | null> - URL of uploaded audio or null if failed
   */
  async generateAudioFromText(
    text: string,
    folder: string,
    prefix: string = 'audio'
  ): Promise<string | null> {
    this.logger.log(`Generating text-to-speech from: ${text}`)
    try {
      // 1. Generate audio using TTS
      const ttsResult = await this.convertTextToSpeech(text, {
        languageCode: 'ja-JP',
        audioEncoding: 'MP3'
      })

      // 2. Create a buffer file to upload
      const audioBuffer = ttsResult.audioContent
      const fileName = `${prefix}_${Date.now()}.mp3`

      // Convert buffer to Multer file-like object
      const generatedAudioFile: Express.Multer.File = {
        buffer: audioBuffer,
        originalname: fileName,
        mimetype: 'audio/mpeg',
        fieldname: 'audio',
        encoding: '7bit',
        size: audioBuffer.length,
        destination: '',
        filename: fileName,
        path: '',
        stream: null as any
      }

      // 3. Upload the generated audio file
      const audioResult = await this.uploadService.uploadFile(
        generatedAudioFile,
        `${folder}/audio`
      )
      this.logger.log(`Generated audioUrl: ${audioResult.url}`)
      return audioResult.url
    } catch (ttsError) {
      this.logger.error('Error generating text-to-speech:', ttsError)
      // Nếu không thể tạo audio, return null
      return null
    }
  }
}
