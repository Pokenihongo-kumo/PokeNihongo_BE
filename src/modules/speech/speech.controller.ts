import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  Body,
  Logger,
  UseGuards,
  Inject
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody
} from '@nestjs/swagger'
import { Redis } from 'ioredis'
import { createHash } from 'crypto'
import { SpeechToTextService, SpeechToTextOptions } from './speech-to-text.service'
import { TextToSpeechService } from './text-to-speech.service'
import {
  SpeechToTextRequestDTO,
  SpeechToTextMultipartDTO,
  SpeechToTextApiResponseDTO,
  SupportedLanguagesApiResponseDTO,
  JapaneseVoicesApiResponseDTO,
  PreviewVoiceRequestDTO,
  PreviewVoiceApiResponseDTO
} from './dto/speech.dto'
import { SPEECH_CONFIG } from './config/speech.config'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'

@Controller('speech')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class SpeechController {
  private readonly logger = new Logger(SpeechController.name)
  private readonly CACHE_PREFIX = 'voice_preview:'
  // TTL: 5 phút (300 giây) - cache ngắn hạn để tránh gọi API lặp lại trong thời gian ngắn
  // Có thể điều chỉnh: 5 phút = 5*60, 1 giờ = 60*60, 1 ngày = 24*60*60
  private readonly CACHE_TTL = 5 * 60 // 5 minutes in seconds (300 seconds)

  constructor(
    private readonly speechToTextService: SpeechToTextService,
    private readonly textToSpeechService: TextToSpeechService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis
  ) {}

  @Post('to-text')
  @UseInterceptors(FileInterceptor('audio'))
  @ApiOperation({
    summary: 'Chuyển đổi âm thanh thành văn bản bằng Google Speech-to-Text'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: SpeechToTextMultipartDTO })
  @ApiResponse({
    status: 200,
    description: 'Chuyển đổi thành công',
    type: SpeechToTextApiResponseDTO
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu âm thanh không hợp lệ'
  })
  async convertToText(
    @UploadedFile() audioFile: Express.Multer.File,
    @Body() options: SpeechToTextRequestDTO
  ) {
    try {
      this.logger.log(`Processing audio file: ${audioFile.originalname}`)

      if (!audioFile) {
        throw new Error(SPEECH_CONFIG.ERROR_MESSAGES.MISSING_AUDIO_FILE)
      }

      // Validate audio format
      const encoding = options.encoding || SPEECH_CONFIG.DEFAULT_ENCODING
      const isValid = this.speechToTextService.validateAudioFormat(
        audioFile.buffer,
        encoding
      )

      if (!isValid) {
        throw new Error(SPEECH_CONFIG.ERROR_MESSAGES.INVALID_AUDIO_FORMAT)
      }

      // Convert audio to text
      const result = await this.speechToTextService.convertAudioToText(audioFile.buffer, {
        languageCode: options.languageCode,
        sampleRateHertz: options.sampleRateHertz,
        encoding: options.encoding,
        enableAutomaticPunctuation: options.enableAutomaticPunctuation,
        enableWordTimeOffsets: options.enableWordTimeOffsets,
        model: options.model
      })

      this.logger.log(
        `Speech-to-Text result: "${result.transcript}" (confidence: ${result.confidence})`
      )

      return {
        statusCode: 200,
        data: result,
        message: SPEECH_CONFIG.SUCCESS_MESSAGES.SPEECH_TO_TEXT_SUCCESS
      }
    } catch (error) {
      this.logger.error('Speech-to-Text conversion failed:', error)
      throw new Error(`Chuyển đổi âm thanh thất bại: ${error.message}`)
    }
  }

  @Post('supported-languages')
  @ApiOperation({ summary: 'Lấy danh sách ngôn ngữ được hỗ trợ' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách ngôn ngữ thành công',
    type: SupportedLanguagesApiResponseDTO
  })
  async getSupportedLanguages() {
    try {
      const languages = await this.speechToTextService.getSupportedLanguages()

      return {
        statusCode: 200,
        data: { languages },
        message: SPEECH_CONFIG.SUCCESS_MESSAGES.LANGUAGES_RETRIEVED_SUCCESS
      }
    } catch (error) {
      this.logger.error('Failed to get supported languages:', error)
      throw new Error('Không thể lấy danh sách ngôn ngữ')
    }
  }

  @Get('voices/ja-JP')
  @ApiOperation({ summary: 'Lấy danh sách các voice models tiếng Nhật' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách voice models tiếng Nhật thành công',
    type: JapaneseVoicesApiResponseDTO
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi khi lấy danh sách voice models'
  })
  async getJapaneseVoices() {
    try {
      const voices = await this.textToSpeechService.getJapaneseVoices()

      return {
        statusCode: 200,
        data: {
          voices,
          total: voices.length
        },
        message: 'Lấy danh sách voice models tiếng Nhật thành công'
      }
    } catch (error) {
      this.logger.error('Failed to get Japanese voices:', error)
      throw new Error(`Không thể lấy danh sách voice models tiếng Nhật: ${error.message}`)
    }
  }

  @Post('preview-voice')
  @ApiOperation({ summary: 'Nghe thử voice model với text mẫu' })
  @ApiResponse({
    status: 200,
    description: 'Tạo audio preview thành công',
    type: PreviewVoiceApiResponseDTO
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ'
  })
  async previewVoice(@Body() body: PreviewVoiceRequestDTO) {
    try {
      const sampleText = body.sampleText || 'こんにちは。今日はいい天気ですね。'
      const voiceName = body.voiceName || 'ja-JP-Wavenet-A'

      // Tạo cache key từ voiceName và hash của sampleText
      const textHash = createHash('md5').update(sampleText).digest('hex').substring(0, 8)
      const cacheKey = `${this.CACHE_PREFIX}${voiceName}:${textHash}`

      // Kiểm tra cache trước
      try {
        const cachedAudio = await this.redisClient.get(cacheKey)
        if (cachedAudio) {
          this.logger.log(`Cache hit for voice preview: ${voiceName} (key: ${cacheKey})`)
          return {
            statusCode: 200,
            data: {
              audio: cachedAudio,
              audioFormat: 'ogg'
            },
            message: 'Tạo audio preview thành công (từ cache)'
          }
        }
      } catch (cacheError) {
        this.logger.warn(
          `Cache read error (continuing with API call): ${cacheError.message}`
        )
      }

      // Nếu không có cache, gọi API
      this.logger.log(
        `Previewing voice: ${voiceName} with text: "${sampleText}" (cache miss)`
      )

      const result = await this.textToSpeechService.convertTextToSpeech(sampleText, {
        languageCode: 'ja-JP',
        voiceName: voiceName,
        audioEncoding: 'OGG_OPUS',
        speakingRate: 1.0,
        pitch: 0.0
      })

      if (!result || !result.audioContent) {
        throw new Error('Không thể tạo audio preview')
      }

      const audioBase64 = result.audioContent.toString('base64')

      // Lưu vào cache (async, không block response)
      try {
        await this.redisClient.setex(cacheKey, this.CACHE_TTL, audioBase64)
        this.logger.log(
          `Cached voice preview: ${voiceName} (key: ${cacheKey}, TTL: ${this.CACHE_TTL}s)`
        )
      } catch (cacheError) {
        this.logger.warn(`Cache write error (non-critical): ${cacheError.message}`)
      }

      return {
        statusCode: 200,
        data: {
          audio: audioBase64,
          audioFormat: 'ogg'
        },
        message: 'Tạo audio preview thành công'
      }
    } catch (error) {
      this.logger.error('Failed to preview voice:', error)
      throw new Error(`Không thể tạo audio preview: ${error.message}`)
    }
  }
}
