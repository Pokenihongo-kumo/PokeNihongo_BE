import { BullQueue } from '@/common/constants/bull-action.constant'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets'
import { Queue } from 'bull'
import { Server, Socket } from 'socket.io'
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold
} from '@google/generative-ai'
import { SpeechToTextService } from '@/3rdService/speech/speech-to-text.service'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { KAIWA_EVENTS, SOCKET_ROOM } from '@/common/constants/socket.constant'
import { Error as ErrorMessage } from '@/common/constants/message'
import { FeatureKey } from '@/common/constants/subscription.constant'
import { UserAIConversationService } from '@/modules/user-ai-conversation/user-ai-conversation.service'
import { AIConversationRoomService } from '@/modules/ai-conversation-room/ai-conversation-room.service'
import { I18nService } from '@/i18n/i18n.service'
import { UploadService } from '@/3rdService/upload/upload.service'
import { GeminiConfigRepo } from '@/modules/gemini-config/gemini-config.repo'
import { GeminiConfigType } from '@prisma/client'
import {
  getRoomTitlePrompt,
  getRoomTitleLabels,
  getDefaultGenerationConfig,
  buildSystemPromptWithLevel,
  DEFAULT_KAIWA_SYSTEM_PROMPT
} from '@/common/constants/promt.constant'
import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { SharedUserSubscriptionService } from '@/shared/services/user-subscription.service'
import { exec } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFile, unlink, readFile } from 'fs/promises'
import { randomUUID } from 'crypto'

const execAsync = promisify(exec)

/**
 * KaiwaGateway - WebSocket Gateway for real-time audio conversation
 * Handles audio input -> Speech-to-Text -> Gemini AI -> Text-to-Speech -> Audio output
 *
 * Nghiệp vụ sử dụng GeminiConfig:
 *
 * 1. **Khi có config trong DB:**
 *    - Lấy config từ GeminiServiceConfig mapping (serviceType → GeminiConfig)
 *    - Sử dụng model, prompt, generationConfig, safetySettings từ DB
 *    - Cho phép admin tùy chỉnh mà không cần deploy code
 *
 * 2. **Khi KHÔNG có config trong DB:**
 *    - Hệ thống tự động fallback về default values (hardcoded)
 *    - Model: gemini-2.5-flash (default)
 *    - Prompt: Default prompts (hardcoded trong code)
 *    - GenerationConfig: Từ env config hoặc hardcoded values
 *    - SafetySettings: BLOCK_NONE (để tránh block responses)
 *    - Hệ thống vẫn hoạt động bình thường, không bị lỗi
 *
 * 3. **Các AI tasks trong socket:**
 *    - AI_KAIWA_ROOM_TITLE: Tạo tiêu đề phòng hội thoại
 *    - AI_KAIWA: Hội thoại AI (main conversation)
 *    - AI_KAIWA_TRANSLATION: Dịch câu hội thoại sang tiếng Việt
 *
 * 4. **Flow khi không có config:**
 *    - Log warning để admin biết cần tạo config
 *    - Sử dụng default values để đảm bảo hệ thống hoạt động
 *    - Không ảnh hưởng đến logic socket và FE
 *
 * Lưu ý: Admin nên tạo GeminiServiceConfig mappings trong DB để có thể tùy chỉnh
 * prompts và parameters mà không cần thay đổi code.
 */
@WebSocketGateway({
  namespace: '/kaiwa'
})
@Injectable()
export class KaiwaGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(KaiwaGateway.name)
  private genAI: GoogleGenerativeAI | null = null

  constructor(
    @InjectQueue(BullQueue.KAIWA_PROCESSOR) private readonly kaiwaQueue: Queue,
    private readonly speechToTextService: SpeechToTextService,
    private readonly textToSpeechService: TextToSpeechService,
    private readonly userAIConversationService: UserAIConversationService,
    private readonly aiConversationRoomService: AIConversationRoomService,
    private readonly i18nService: I18nService,
    private readonly uploadService: UploadService,
    private readonly geminiConfigRepo: GeminiConfigRepo,
    private readonly configService: ConfigService,
    private readonly sharedUserRepo: SharedUserRepository,
    private readonly sharedUserSubscriptionService: SharedUserSubscriptionService
  ) {
    // Initialize Gemini API với API Key
    const geminiConfig = this.configService.get('gemini')
    const apiKey = geminiConfig?.apiKey || process.env.GEMINI_API_KEY

    if (!apiKey || apiKey.trim() === '') {
      this.logger.warn('[Kaiwa] GEMINI_API_KEY not found. Gemini API will not work.')
      this.logger.warn('[Kaiwa] Please set GEMINI_API_KEY in .env')
      return
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey)
      this.logger.log('[Kaiwa] Gemini API initialized with API Key')
    } catch (error) {
      this.logger.error(`[Kaiwa] Failed to initialize Gemini API: ${error.message}`)
    }
  }

  /**
   * Lấy Gemini config từ DB cho service type
   *  CHO PHÉP FALLBACK (Lenient Mode) - Áp dụng cho KAIWA SOCKET:
   * - Real-time services (WebSocket, Socket.IO): Không thể throw error cho user đang trong conversation
   * - User experience quan trọng: Cần đảm bảo service luôn available
   * - Development/Staging: Dễ test và develop mà không cần setup config ngay
   * - Graceful degradation: Hệ thống vẫn hoạt động với default values
   *
   *  KHÔNG CHO PHÉP (Strict Mode) - Áp dụng cho một số services:
   * - Services có data access policy (PERSONALIZED_RECOMMENDATIONS): Bắt buộc policy config
   * - Security-sensitive services: Cần config để đảm bảo security
   * - Production critical features: Cần đảm bảo config đúng trước khi chạy
   *
   * ═══════════════════════════════════════════════════════════════════════════
   * NGHIỆP VỤ KAIWA SOCKET (LENIENT MODE - CHO PHÉP FALLBACK):
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * 1. Tìm GeminiServiceConfig có isDefault=true và isActive=true
   * 2. Nếu không có, tìm GeminiServiceConfig có isActive=true (lấy cái đầu tiên)
   * 3. Nếu không có config nào → trả về null → sẽ dùng default values (hardcoded)
   *
   * Flow khi không có config:
   * - Model: Dùng default model (gemini-2.5-flash hoặc gemini-2.5-pro)
   * - Prompt: Dùng default prompt (hardcoded trong code)
   * - GenerationConfig: Dùng default từ env config hoặc hardcoded
   * - SafetySettings: Dùng default BLOCK_NONE (để tránh block responses)
   * - AI VẪN CHẠY ĐƯỢC: Hệ thống không bị lỗi, user vẫn có thể sử dụng
   *
   * ═══════════════════════════════════════════════════════════════════════════
   * LÝ DO KAIWA SOCKET CHO PHÉP FALLBACK:
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * 1. Real-time service: User đang trong conversation, không thể throw error
   * 2. Availability: Đảm bảo service luôn available, không bị downtime
   * 3. User experience: User có thể sử dụng ngay, không cần chờ admin config
   * 4. Development: Dễ test và develop mà không cần setup config phức tạp
   * 5. Graceful degradation: Vẫn hoạt động với default values, có thể cải thiện sau
   * - Logging: Hệ thống sẽ log warning khi không có config để admin biết cần tạo
   */
  private async getGeminiConfigForService(serviceType: GeminiConfigType): Promise<any> {
    try {
      const svcCfg = await this.geminiConfigRepo.getDefaultConfigForService(
        serviceType as any
      )

      if (!svcCfg || !svcCfg.geminiConfig) {
        this.logger.warn(
          `[Kaiwa]  No GeminiServiceConfig found for ${serviceType}. ` +
            `Will use default values (model, prompt, generationConfig). ` +
            `Please create a GeminiServiceConfig mapping for ${serviceType} in the database.`
        )
        return null
      }

      this.logger.debug(
        `[Kaiwa] Found GeminiServiceConfig for ${serviceType}: ` +
          `model=${svcCfg.geminiConfig.geminiConfigModel?.geminiModel?.key || 'N/A'}, ` +
          `hasPrompt=${!!svcCfg.geminiConfig.prompt}`
      )

      return svcCfg.geminiConfig
    } catch (error) {
      this.logger.error(
        `[Kaiwa] Error getting config for ${serviceType}: ${error.message}. ` +
          `Will use default values.`,
        error.stack
      )
      return null
    }
  }

  /**
   * Build generationConfig từ DB config model
   *
   * Nghiệp vụ:
   * 1. Nếu có dbConfigModel từ DB → merge config từ DB (maxTokens, preset: temperature/topP/topK, systemInstruction)
   * 2. Nếu không có dbConfigModel → chỉ dùng defaultConfig và env config
   *
   * Ưu tiên: DB config > defaultConfig > env config
   *
   * @param dbConfigModel - GeminiConfigModel từ DB (có thể null nếu không có config)
   * @param defaultConfig - Default config values (hardcoded fallback)
   * @returns { generationConfig, systemInstruction } - systemInstruction tách riêng vì không thuộc generationConfig
   */
  private buildGenerationConfig(
    dbConfigModel: any,
    defaultConfig?: any
  ): { generationConfig: any; systemInstruction?: string } {
    const geminiConfig = this.configService.get('gemini')
    const generationConfig: any = {
      ...(geminiConfig?.generationConfig || {}),
      ...(defaultConfig || {})
    }

    let systemInstruction: string | undefined = undefined

    if (!dbConfigModel) {
      return { generationConfig, systemInstruction }
    }

    // Lấy maxTokens từ DB (GoogleGenerativeAI dùng maxOutputTokens)
    if (dbConfigModel.maxTokens) {
      generationConfig.maxOutputTokens = dbConfigModel.maxTokens
    }

    // Lấy preset config nếu có
    if (dbConfigModel.preset) {
      const preset = dbConfigModel.preset
      if (preset.temperature !== undefined && preset.temperature !== null) {
        generationConfig.temperature = preset.temperature
      }
      if (preset.topP !== undefined && preset.topP !== null) {
        generationConfig.topP = preset.topP
      }
      if (preset.topK !== undefined && preset.topK !== null) {
        generationConfig.topK = preset.topK
      }
    }

    // Lấy systemInstruction từ DB nếu có (tách riêng, không thuộc generationConfig)
    if (dbConfigModel.systemInstruction) {
      systemInstruction = dbConfigModel.systemInstruction
    }

    return { generationConfig, systemInstruction }
  }

  /**
   * Build safetySettings từ DB config hoặc default
   *
   * Nghiệp vụ:
   * 1. Nếu có safetySettings từ DB → dùng DB config (convert format nếu cần)
   * 2. Nếu không có từ DB → dùng từ env config
   * 3. Nếu không có từ env → dùng default BLOCK_NONE (để tránh block responses trong kaiwa)
   *
   * Lưu ý: Default là BLOCK_NONE để đảm bảo kaiwa conversation không bị block bởi safety filters
   *
   * @param dbConfigModel - GeminiConfigModel từ DB (có thể null)
   * @returns Safety settings array cho GoogleGenerativeAI
   */
  private buildSafetySettingsOrDefault(dbConfigModel: any): any[] {
    const geminiConfig = this.configService.get('gemini')

    // Ưu tiên dùng safetySettings từ DB nếu có
    if (dbConfigModel?.safetySettings) {
      // Convert từ DB format (có thể là object hoặc array) sang GoogleGenerativeAI format
      if (Array.isArray(dbConfigModel.safetySettings)) {
        return dbConfigModel.safetySettings
      } else if (typeof dbConfigModel.safetySettings === 'object') {
        // Convert object format sang array format
        const converted: any[] = []
        const categoryMap: Record<string, string> = {
          HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
          HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
          SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT'
        }
        const thresholdMap: Record<string, string> = {
          BLOCK: 'BLOCK_MEDIUM_AND_ABOVE',
          BLOCK_NONE: 'BLOCK_NONE',
          BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH'
        }

        for (const [key, value] of Object.entries(dbConfigModel.safetySettings)) {
          const category =
            categoryMap[key.toUpperCase()] || `HARM_CATEGORY_${key.toUpperCase()}`
          const threshold =
            typeof value === 'string'
              ? thresholdMap[value.toUpperCase()] || value.toUpperCase()
              : 'BLOCK_MEDIUM_AND_ABOVE'
          converted.push({ category, threshold })
        }
        return converted
      }
    }

    // Fallback: dùng safetySettings từ env config
    if (geminiConfig?.safetySettings && Array.isArray(geminiConfig.safetySettings)) {
      return geminiConfig.safetySettings
    }

    // Default: BLOCK_NONE cho tất cả (để tránh block responses)
    return [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE
      }
    ]
  }

  /**
   * Get GenAI instance cho model (hỗ trợ Flash và Pro models)
   */
  private getGenAIForModel(modelName: string): GoogleGenerativeAI {
    if (!this.genAI) {
      throw new Error('Gemini API not initialized')
    }

    const normalizedModelName = modelName.toLowerCase()
    const isFlashModel = normalizedModelName.includes('flash')

    // Hiện tại chỉ có một instance, nhưng có thể mở rộng sau
    // Nếu cần phân biệt Flash và Pro, có thể tạo separate instances
    return this.genAI
  }

  /**
   * Validate xem text có chứa tiếng Nhật không
   * Kiểm tra xem có ít nhất một ký tự tiếng Nhật (Hiragana, Katakana, Kanji)
   * và không có quá nhiều ký tự Latin (a-z, A-Z) - cho phép một số ký tự Latin cho punctuation
   *
   * @param text - Text cần validate
   * @returns true nếu có vẻ là tiếng Nhật, false nếu không
   */
  private isValidJapaneseText(text: string): boolean {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return false
    }

    // Loại bỏ whitespace và punctuation thông thường để kiểm tra
    const trimmedText = text.trim()

    // Kiểm tra có chứa ký tự tiếng Nhật (Hiragana, Katakana, Kanji)
    // Unicode ranges:
    // - Hiragana: \u3040-\u309F
    // - Katakana: \u30A0-\u30FF
    // - Kanji: \u4E00-\u9FAF (CJK Unified Ideographs)
    // - Extended Kanji: \u3400-\u4DBF, \u20000-\u2A6DF, etc.
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]/
    const hasJapanese = japaneseRegex.test(trimmedText)

    if (!hasJapanese) {
      return false
    }

    // Kiểm tra xem có quá nhiều ký tự Latin không (không phải tiếng Nhật)
    // Cho phép một số ký tự Latin cho punctuation và số, nhưng nếu có quá nhiều thì không phải tiếng Nhật
    const latinChars = (trimmedText.match(/[a-zA-Z]/g) || []).length
    const totalChars = trimmedText.replace(/\s/g, '').length

    // Nếu có hơn 30% là ký tự Latin, có thể không phải tiếng Nhật
    if (totalChars > 0 && latinChars / totalChars > 0.3) {
      return false
    }

    return true
  }

  /**
   * Lấy user info và cache levelJLPT trong client.data
   * Nếu đã có trong client.data thì không query lại
   *
   * @param client - Socket client
   * @param userId - User ID
   * @returns LevelJLPT của user (1-5 hoặc null)
   */
  private async getUserLevelJLPT(client: Socket, userId: number): Promise<number | null> {
    // Nếu đã cache trong client.data thì dùng luôn
    if (client.data.levelJLPT !== undefined) {
      return client.data.levelJLPT
    }

    try {
      // Query user từ DB
      const user = await this.sharedUserRepo.findUnique({ id: userId })
      const levelJLPT = user?.levelJLPT || null

      // Cache vào client.data để không phải query lại
      client.data.levelJLPT = levelJLPT

      this.logger.log(`[Kaiwa] User ${userId} levelJLPT: ${levelJLPT || 'not set'}`)
      return levelJLPT
    } catch (error) {
      this.logger.error(
        `[Kaiwa] Failed to get user levelJLPT: ${error.message}`,
        error.stack
      )
      // Nếu lỗi, cache null và return null
      client.data.levelJLPT = null
      return null
    }
  }

  /**
   * Step 1: Speech-to-Text - Convert audio thành text
   * @param audioBuffer - Audio buffer cần convert
   * @param audioFormat - Format của audio (LINEAR16, MP4, M4A, OGG, WEBM)
   * @param requestId - Request ID cho logging
   * @param client - Socket client để emit events
   * @returns Transcription text
   * @throws Error nếu speech-to-text fails
   */
  private async processSpeechToText(
    audioBuffer: Buffer,
    audioFormat: 'LINEAR16' | 'MP4' | 'M4A' | 'OGG' | 'WEBM',
    requestId: string,
    client: Socket
  ): Promise<string> {
    this.logger.log(
      `[Kaiwa] [${requestId}] [SPEECH_TO_TEXT] processSpeechToText called with audioBuffer size: ${audioBuffer?.length || 0} bytes`
    )

    if (!audioBuffer || audioBuffer.length === 0) {
      this.logger.error(
        `[Kaiwa] [${requestId}] [SPEECH_TO_TEXT] ERROR: audioBuffer is null or empty`
      )
      throw new Error('Audio buffer is empty or null')
    }

    // Emit processing status
    client.emit(KAIWA_EVENTS.PROCESSING, {
      conversationId: client.data.conversationId,
      status: 'speech-to-text',
      message: 'Đang chuyển đổi âm thanh thành văn bản...'
    })

    // Map audioFormat sang encoding cho Google Speech-to-Text API
    // Google Speech-to-Text chỉ hỗ trợ: LINEAR16, FLAC, MULAW, AMR, AMR_WB, OGG_OPUS, SPEEX_WITH_HEADER_BYTE
    // Không hỗ trợ MP4/M4A trực tiếp qua content base64
    let encoding:
      | 'LINEAR16'
      | 'FLAC'
      | 'MULAW'
      | 'AMR'
      | 'AMR_WB'
      | 'OGG_OPUS'
      | 'SPEEX_WITH_HEADER_BYTE' = 'LINEAR16'

    if (audioFormat === 'LINEAR16') {
      encoding = 'LINEAR16'
      this.logger.log(
        `[Kaiwa] [${requestId}] [SPEECH_TO_TEXT] Audio format is LINEAR16, using LINEAR16 encoding`
      )
    } else if (audioFormat === 'OGG') {
      encoding = 'OGG_OPUS'
      this.logger.log(
        `[Kaiwa] [${requestId}] [SPEECH_TO_TEXT] Audio format is OGG, using OGG_OPUS encoding`
      )
    } else if (audioFormat === 'MP4' || audioFormat === 'M4A') {
      // MP4/M4A không được hỗ trợ trực tiếp qua content base64 bởi Google Speech-to-Text API
      // Cần convert sang FLAC/WAV trước khi gửi vào API
      // Conversion sẽ được thực hiện ở đây
      this.logger.log(
        `[Kaiwa] [${requestId}] [SPEECH_TO_TEXT] Audio format is ${audioFormat}, will convert to FLAC before processing`
      )
      encoding = 'FLAC' // Sau khi convert sẽ dùng FLAC encoding
    } else if (audioFormat === 'WEBM') {
      // WEBM thường chứa OGG_OPUS audio
      encoding = 'OGG_OPUS'
      this.logger.log(
        `[Kaiwa] [${requestId}] [SPEECH_TO_TEXT] Audio format is WEBM, using OGG_OPUS encoding`
      )
    } else {
      this.logger.warn(
        `[Kaiwa] [${requestId}] [SPEECH_TO_TEXT] Unknown audio format: ${audioFormat}, defaulting to LINEAR16`
      )
      encoding = 'LINEAR16'
    }

    // Convert MP4/M4A sang FLAC nếu cần
    let finalAudioBuffer = audioBuffer
    if (audioFormat === 'MP4' || audioFormat === 'M4A') {
      try {
        this.logger.log(
          `[Kaiwa] [${requestId}] [SPEECH_TO_TEXT] Converting ${audioFormat} to FLAC format...`
        )
        finalAudioBuffer = await this.convertMp4ToFlac(audioBuffer, requestId)
        this.logger.log(
          `[Kaiwa] [${requestId}] [SPEECH_TO_TEXT] Conversion complete: ${audioBuffer.length} bytes → ${finalAudioBuffer.length} bytes`
        )
      } catch (convertError) {
        this.logger.error(
          `[Kaiwa] [${requestId}] [SPEECH_TO_TEXT] Failed to convert ${audioFormat} to FLAC: ${convertError.message}`
        )
        throw new Error(
          `Không thể chuyển đổi định dạng ${audioFormat}. Vui lòng gửi audio ở định dạng FLAC, WAV, hoặc OGG_OPUS. Chi tiết: ${convertError.message}`
        )
      }
    }

    // Thêm timeout để tránh đợi quá lâu (20 giây)
    this.logger.log(
      `[Kaiwa] [${requestId}] [SPEECH_TO_TEXT] Calling speechToTextService.convertAudioToText with buffer size: ${finalAudioBuffer.length} bytes, encoding: ${encoding}, original format: ${audioFormat}`
    )
    const speechPromise = this.speechToTextService.convertAudioToText(finalAudioBuffer, {
      languageCode: 'ja-JP',
      enableAutomaticPunctuation: true,
      sampleRateHertz: 16000,
      encoding: encoding
    })

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Speech-to-Text timeout sau 20 giây')), 20000)
    })

    const speechResult = await Promise.race([speechPromise, timeoutPromise])
    const transcription = speechResult.transcript
    this.logger.log(
      `[Kaiwa] [${requestId}] Speech-to-Text: "${transcription}" (confidence: ${speechResult.confidence})`
    )

    if (!transcription || transcription.trim() === '') {
      this.logger.warn(`[Kaiwa] [${requestId}] Speech-to-Text returned empty transcript`)
      client.emit(KAIWA_EVENTS.ERROR, {
        message: ErrorMessage.SPEECH_RECOGNITION_FAILED,
        suggestion: ErrorMessage.SPEECH_RECOGNITION_SUGGESTION
      })
      throw new Error('Speech-to-Text returned empty transcript')
    }

    // Validate xem transcription có phải là tiếng Nhật không
    if (!this.isValidJapaneseText(transcription)) {
      this.logger.warn(
        `[Kaiwa] [${requestId}] Transcription is not Japanese: "${transcription}"`
      )
      client.emit(KAIWA_EVENTS.ERROR, {
        message: ErrorMessage.NOT_JAPANESE_LANGUAGE,
        suggestion: ErrorMessage.NOT_JAPANESE_LANGUAGE_SUGGESTION
      })
      throw new Error('Transcription is not Japanese')
    }

    // Emit transcription ngay lập tức
    client.emit(KAIWA_EVENTS.TRANSCRIPTION, {
      conversationId: client.data.conversationId,
      text: transcription,
      timestamp: Date.now()
    })

    return transcription
  }

  /**
   * Parse audio payload và detect format
   * Hỗ trợ nhiều format: Buffer, Uint8Array, object với audio field, base64 string
   * Auto-detect format từ metadata hoặc buffer header
   * @param payload - Audio payload từ client (có thể là Buffer, Uint8Array, object, hoặc base64 string)
   * @param requestId - Request ID cho logging
   * @returns Object chứa audioBuffer, audioFormat, mimeType
   * @throws Error nếu payload không hợp lệ
   */
  private parseAudioPayload(
    payload: any,
    requestId: string
  ): {
    audioBuffer: Buffer
    audioFormat: 'LINEAR16' | 'MP4' | 'M4A' | 'OGG' | 'WEBM'
    mimeType: string
  } {
    this.logger.log(`[Kaiwa] [${requestId}] [PARSE_AUDIO] Starting parseAudioPayload`)
    let audioBuffer: Buffer
    let audioFormat: 'LINEAR16' | 'MP4' | 'M4A' | 'OGG' | 'WEBM' = 'LINEAR16' // Default cho web browser
    let mimeType: string = 'audio/wav' // Default

    // Parse payload thành Buffer
    if (Buffer.isBuffer(payload)) {
      this.logger.log(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] Payload is Buffer, size: ${payload.length} bytes`
      )
      audioBuffer = payload
    } else if (payload instanceof Uint8Array) {
      this.logger.log(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] Payload is Uint8Array, size: ${payload.length} bytes`
      )
      audioBuffer = Buffer.from(payload)
      this.logger.log(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] Converted Uint8Array to Buffer, size: ${audioBuffer.length} bytes`
      )
    } else if (payload && typeof payload === 'object') {
      this.logger.log(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] Payload is object, checking audio field...`
      )
      // Nếu là object có field audio và có thể có metadata
      if (payload.audio) {
        if (payload.audio instanceof Uint8Array) {
          this.logger.log(
            `[Kaiwa] [${requestId}] [PARSE_AUDIO] payload.audio is Uint8Array, size: ${payload.audio.length} bytes`
          )
          audioBuffer = Buffer.from(payload.audio)
          this.logger.log(
            `[Kaiwa] [${requestId}] [PARSE_AUDIO] Converted payload.audio (Uint8Array) to Buffer, size: ${audioBuffer.length} bytes`
          )
        } else if (Buffer.isBuffer(payload.audio)) {
          this.logger.log(
            `[Kaiwa] [${requestId}] [PARSE_AUDIO] payload.audio is Buffer, size: ${payload.audio.length} bytes`
          )
          audioBuffer = payload.audio
        } else {
          this.logger.error(
            `[Kaiwa] [${requestId}] [PARSE_AUDIO] ERROR: payload.audio is ${typeof payload.audio}, not Uint8Array or Buffer`
          )
          throw new Error('Invalid audio format: must be Uint8Array or Buffer')
        }
      } else {
        this.logger.error(
          `[Kaiwa] [${requestId}] [PARSE_AUDIO] ERROR: payload object does not have audio field`
        )
        throw new Error('Invalid payload: object must have audio field')
      }

      // Detect format từ metadata (nếu có)
      if (payload.format) {
        audioFormat = payload.format.toUpperCase() as any
        this.logger.log(
          `[Kaiwa] [${requestId}] [PARSE_AUDIO] Using format from metadata: ${audioFormat}`
        )
      }
      if (payload.mimeType) {
        mimeType = payload.mimeType
        this.logger.log(
          `[Kaiwa] [${requestId}] [PARSE_AUDIO] Using mimeType from metadata: ${mimeType}`
        )
      }
    } else if (typeof payload === 'string') {
      this.logger.log(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] Payload is string (base64), length: ${payload.length} chars`
      )
      // Nếu là base64 string
      try {
        audioBuffer = Buffer.from(payload, 'base64')
        this.logger.log(
          `[Kaiwa] [${requestId}] [PARSE_AUDIO] Decoded base64 to Buffer, size: ${audioBuffer.length} bytes`
        )
      } catch (e) {
        this.logger.error(
          `[Kaiwa] [${requestId}] [PARSE_AUDIO] ERROR: Failed to decode base64: ${e.message}`
        )
        throw new Error(`Failed to decode base64 audio: ${e.message}`)
      }
    } else {
      this.logger.error(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] ERROR: Invalid payload type: ${typeof payload}`
      )
      throw new Error(
        `Invalid payload type: expected Buffer, Uint8Array, or object with audio field, got ${typeof payload}`
      )
    }

    // Auto-detect format từ buffer header nếu chưa có metadata
    // Chỉ detect nếu chưa có format từ metadata
    if (audioFormat === 'LINEAR16' && audioBuffer.length >= 12) {
      const header0_4 = audioBuffer.toString('ascii', 0, 4)
      const header4_8 = audioBuffer.length >= 8 ? audioBuffer.toString('ascii', 4, 8) : ''
      const header8_12 =
        audioBuffer.length >= 12 ? audioBuffer.toString('ascii', 8, 12) : ''

      // Check CAFF format (Core Audio Format - iOS/macOS)
      if (header0_4 === 'caff') {
        // CAFF file (Core Audio Format của iOS/macOS)
        // CAFF có thể chứa nhiều codec, nhưng thường được Google Speech API xử lý như LINEAR16
        audioFormat = 'LINEAR16' // Xử lý như LINEAR16 (đã hoạt động trên máy ảo)
        mimeType = 'audio/x-caf' // Core Audio Format
        this.logger.log(
          `[Kaiwa] [${requestId}] Detected CAFF format from header (Core Audio Format - iOS/macOS)`
        )
      }
      // Check WAV format (RIFF...WAVE)
      else if (header0_4 === 'RIFF' && header8_12 === 'WAVE') {
        // WAV file (đã có header, không cần convert)
        audioFormat = 'LINEAR16' // Vẫn dùng LINEAR16 nhưng đã là WAV format
        mimeType = 'audio/wav'
        this.logger.log(`[Kaiwa] [${requestId}] Detected WAV format from header`)
      }
      // Check MP4/M4A format (ftyp ở byte 4)
      else if (
        header4_8 === 'ftyp' ||
        header4_8.includes('mp4') ||
        header4_8.includes('M4A') ||
        header4_8.includes('isom') ||
        header4_8.includes('qt  ')
      ) {
        // MP4/M4A file (header thường ở byte 4)
        audioFormat =
          header4_8.includes('M4A') || header4_8.includes('M4A ') ? 'M4A' : 'MP4'
        mimeType = 'audio/mp4'
        this.logger.log(
          `[Kaiwa] [${requestId}] Detected ${audioFormat} format from header (${header4_8})`
        )
      }
      // Check OGG format
      else if (header0_4 === 'OggS') {
        // OGG file
        audioFormat = 'OGG'
        mimeType = 'audio/ogg'
        this.logger.log(`[Kaiwa] [${requestId}] Detected OGG format from header`)
      }
      // Check WEBM format
      else if (header0_4 === 'RIFF' && header8_12 === 'WEBM') {
        // WEBM file
        audioFormat = 'WEBM'
        mimeType = 'audio/webm'
        this.logger.log(`[Kaiwa] [${requestId}] Detected WEBM format from header`)
      } else {
        // Raw LINEAR16 PCM (không có header) - sẽ convert sang WAV
        this.logger.log(
          `[Kaiwa] [${requestId}] No format header detected (header0_4: "${header0_4}", header4_8: "${header4_8}"), assuming LINEAR16 PCM (will convert to WAV)`
        )
      }
    } else if (audioFormat === 'LINEAR16') {
      // Buffer quá ngắn, assume là raw PCM
      this.logger.log(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] Buffer too short (${audioBuffer.length} bytes) for format detection, assuming LINEAR16 PCM (will convert to WAV)`
      )
    }

    // Log kết quả cuối cùng
    this.logger.log(
      `[Kaiwa] [${requestId}] [PARSE_AUDIO] Parse completed - finalBufferSize: ${audioBuffer.length} bytes, format: ${audioFormat}, mimeType: ${mimeType}`
    )
    if (audioBuffer.length > 0) {
      const headerPreview = audioBuffer.slice(0, Math.min(12, audioBuffer.length))
      this.logger.log(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] Final buffer header (hex): ${headerPreview.toString('hex')}`
      )
    } else {
      this.logger.error(
        `[Kaiwa] [${requestId}] [PARSE_AUDIO] ERROR: Final audio buffer is EMPTY (0 bytes) - NO AUDIO DATA`
      )
    }

    return { audioBuffer, audioFormat, mimeType }
  }

  /**
   * Convert MP4/M4A audio buffer sang FLAC format (sử dụng ffmpeg)
   * @param mp4Buffer - MP4/M4A audio buffer
   * @param requestId - Request ID cho logging
   * @returns FLAC audio buffer
   * @throws Error nếu conversion fails hoặc ffmpeg không có sẵn
   */
  private async convertMp4ToFlac(mp4Buffer: Buffer, requestId: string): Promise<Buffer> {
    const tempInputPath = join(tmpdir(), `input_${randomUUID()}.mp4`)
    const tempOutputPath = join(tmpdir(), `output_${randomUUID()}.flac`)

    try {
      this.logger.log(
        `[Kaiwa] [${requestId}] [AUDIO_CONVERT] Starting MP4 to FLAC conversion, input size: ${mp4Buffer.length} bytes`
      )

      // Write MP4 buffer to temp file
      await writeFile(tempInputPath, mp4Buffer)
      this.logger.log(
        `[Kaiwa] [${requestId}] [AUDIO_CONVERT] Written MP4 to temp file: ${tempInputPath}`
      )

      // Convert MP4 to FLAC using ffmpeg
      // FLAC parameters: 16kHz sample rate, mono channel, 16-bit depth (compatible with Google Speech API)
      const ffmpegCommand = `ffmpeg -i "${tempInputPath}" -ar 16000 -ac 1 -sample_fmt s16 -y "${tempOutputPath}"`

      this.logger.log(`[Kaiwa] [${requestId}] [AUDIO_CONVERT] Running ffmpeg command...`)
      const { stdout, stderr } = await execAsync(ffmpegCommand, {
        timeout: 30000, // 30 seconds timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      })

      if (stderr && !stderr.includes('Stream mapping')) {
        // ffmpeg outputs info to stderr, but errors are also there
        this.logger.warn(
          `[Kaiwa] [${requestId}] [AUDIO_CONVERT] ffmpeg stderr: ${stderr.substring(0, 200)}`
        )
      }

      // Read converted FLAC file
      const flacBuffer = await readFile(tempOutputPath)
      this.logger.log(
        `[Kaiwa] [${requestId}] [AUDIO_CONVERT] Conversion successful, output size: ${flacBuffer.length} bytes`
      )

      return flacBuffer
    } catch (error) {
      this.logger.error(
        `[Kaiwa] [${requestId}] [AUDIO_CONVERT] Failed to convert MP4 to FLAC: ${error.message}`,
        error.stack
      )

      // Check if ffmpeg is not installed
      if (
        error.message.includes('ffmpeg') ||
        error.message.includes('ENOENT') ||
        error.message.includes('not found')
      ) {
        throw new Error(
          'ffmpeg is not installed on the server. Please install ffmpeg to support MP4/M4A audio conversion.'
        )
      }

      throw new Error(`Failed to convert MP4 to FLAC: ${error.message}`)
    } finally {
      // Clean up temp files
      try {
        await unlink(tempInputPath).catch(() => {})
        await unlink(tempOutputPath).catch(() => {})
        this.logger.log(`[Kaiwa] [${requestId}] [AUDIO_CONVERT] Cleaned up temp files`)
      } catch (cleanupError) {
        this.logger.warn(
          `[Kaiwa] [${requestId}] [AUDIO_CONVERT] Failed to clean up temp files: ${cleanupError.message}`
        )
      }
    }
  }

  /**
   * Convert LINEAR16 PCM buffer sang WAV format
   */
  private convertLinear16ToWav(pcmBuffer: Buffer, sampleRate: number = 16000): Buffer {
    const numChannels = 1 // Mono
    const bitsPerSample = 16
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
    const blockAlign = numChannels * (bitsPerSample / 8)
    const dataSize = pcmBuffer.length
    const fileSize = 36 + dataSize

    // Tạo WAV header
    const wavHeader = Buffer.alloc(44)

    // RIFF header
    wavHeader.write('RIFF', 0)
    wavHeader.writeUInt32LE(fileSize, 4)
    wavHeader.write('WAVE', 8)

    // fmt chunk
    wavHeader.write('fmt ', 12)
    wavHeader.writeUInt32LE(16, 16) // fmt chunk size
    wavHeader.writeUInt16LE(1, 20) // audio format (1 = PCM)
    wavHeader.writeUInt16LE(numChannels, 22)
    wavHeader.writeUInt32LE(sampleRate, 24)
    wavHeader.writeUInt32LE(byteRate, 28)
    wavHeader.writeUInt16LE(blockAlign, 32)
    wavHeader.writeUInt16LE(bitsPerSample, 34)

    // data chunk
    wavHeader.write('data', 36)
    wavHeader.writeUInt32LE(dataSize, 40)

    // Combine header + PCM data
    return Buffer.concat([wavHeader, pcmBuffer])
  }

  /**
   * Convert audio Buffer thành Multer file object để upload
   */
  private bufferToMulterFile(
    buffer: Buffer,
    filename: string,
    mimetype: string
  ): Express.Multer.File {
    return {
      buffer: buffer,
      originalname: filename,
      mimetype: mimetype,
      fieldname: 'audio',
      encoding: '7bit',
      size: buffer.length,
      destination: '',
      filename: filename,
      path: '',
      stream: null as any
    }
  }

  /**
   * Upload audio buffer và trả về URL
   */
  private async uploadAudioBuffer(
    audioBuffer: Buffer,
    filename: string,
    mimetype: string,
    folder: string = 'kaiwa/audio'
  ): Promise<string | null> {
    try {
      const audioFile = this.bufferToMulterFile(audioBuffer, filename, mimetype)
      const result = await this.uploadService.uploadFile(audioFile, folder)
      this.logger.log(`[Kaiwa] Audio uploaded successfully: ${result.url}`)
      return result.url
    } catch (error) {
      this.logger.error(`[Kaiwa] Failed to upload audio: ${error.message}`, error.stack)
      return null
    }
  }

  /**
   * Prepare audio buffer for upload: detect format và convert nếu cần
   * @returns { finalBuffer, mimeType, extension }
   */
  private prepareAudioForUpload(
    audioBuffer: Buffer,
    audioFormat: 'LINEAR16' | 'MP4' | 'M4A' | 'OGG' | 'WEBM',
    requestId: string
  ): { finalBuffer: Buffer; mimeType: string; extension: string } {
    let finalBuffer: Buffer
    let mimeType: string
    let extension: string

    if (audioFormat === 'LINEAR16') {
      // Check xem đã là WAV chưa (có header RIFF)
      if (
        audioBuffer.length >= 12 &&
        audioBuffer.toString('ascii', 0, 4) === 'RIFF' &&
        audioBuffer.toString('ascii', 8, 12) === 'WAVE'
      ) {
        // Đã là WAV format, không cần convert
        finalBuffer = audioBuffer
        mimeType = 'audio/wav'
        extension = 'wav'
        this.logger.log(
          `[Kaiwa] [${requestId}] Audio already in WAV format, skipping conversion`
        )
      } else {
        // Raw LINEAR16 PCM, convert sang WAV format
        finalBuffer = this.convertLinear16ToWav(audioBuffer, 16000)
        mimeType = 'audio/wav'
        extension = 'wav'
        this.logger.log(`[Kaiwa] [${requestId}] Converted LINEAR16 PCM to WAV format`)
      }
    } else if (audioFormat === 'MP4' || audioFormat === 'M4A') {
      // MP4/M4A từ mobile - giữ nguyên format
      finalBuffer = audioBuffer
      mimeType = 'audio/mp4' // M4A cũng là MP4 container
      extension = audioFormat === 'MP4' ? 'mp4' : 'm4a'
    } else if (audioFormat === 'OGG') {
      // OGG - giữ nguyên
      finalBuffer = audioBuffer
      mimeType = 'audio/ogg'
      extension = 'ogg'
    } else if (audioFormat === 'WEBM') {
      // WEBM - giữ nguyên
      finalBuffer = audioBuffer
      mimeType = 'audio/webm'
      extension = 'webm'
    } else {
      // Fallback: convert sang WAV
      this.logger.warn(
        `[Kaiwa] [${requestId}] Unknown audio format: ${audioFormat}, converting to WAV`
      )
      finalBuffer = this.convertLinear16ToWav(audioBuffer, 16000)
      mimeType = 'audio/wav'
      extension = 'wav'
    }

    return { finalBuffer, mimeType, extension }
  }

  /**
   * Upload audio và update message với audioUrl (reusable cho cả USER và AI)
   * @param audioBuffer - Audio buffer cần upload
   * @param audioFormat - Format của audio
   * @param messageId - ID của message cần update
   * @param role - Role của message ('USER' hoặc 'AI')
   * @param userId - User ID
   * @param conversationId - Conversation ID
   * @param requestId - Request ID cho logging
   * @param client - Socket client để emit event
   * @param folder - Folder để upload (default: 'kaiwa/audio/user' hoặc 'kaiwa/audio/ai')
   */
  private async uploadAndUpdateMessageAudio(
    audioBuffer: Buffer,
    audioFormat: 'LINEAR16' | 'MP4' | 'M4A' | 'OGG' | 'WEBM',
    messageId: number | null,
    role: 'USER' | 'AI',
    userId: number,
    conversationId: string,
    requestId: string,
    client: Socket,
    folder: string = 'kaiwa/audio'
  ): Promise<void> {
    if (!messageId) {
      this.logger.warn(
        `[Kaiwa] [${requestId}] [Background] ${role} message ID is null, cannot update audioUrl`
      )
      return
    }

    try {
      // Prepare audio for upload
      const { finalBuffer, mimeType, extension } = this.prepareAudioForUpload(
        audioBuffer,
        audioFormat,
        requestId
      )

      // Generate filename
      const prefix = role === 'USER' ? 'user' : 'ai'
      const filename = `${prefix}_${userId}_${Date.now()}.${extension}`
      this.logger.log(
        `[Kaiwa] [${requestId}] [Background] Uploading ${role} audio: format=${audioFormat}, mimeType=${mimeType}, extension=${extension}, size=${finalBuffer.length} bytes`
      )

      // Upload audio
      const audioUrl = await this.uploadAudioBuffer(
        finalBuffer,
        filename,
        mimeType,
        folder
      )

      if (audioUrl) {
        // Update message với audioUrl
        await this.userAIConversationService.update(messageId, {
          audioUrl: audioUrl
        })
        this.logger.log(
          `[Kaiwa] [${requestId}] [Background] Updated ${role} message (ID: ${messageId}) with audioUrl: ${audioUrl}`
        )

        // Emit event để FE update audioUrl cho message đã hiển thị
        this.logger.log(
          `[Kaiwa] [${requestId}] Emitting message-audio-updated for ${role} message (ID: ${messageId})`
        )
        client.emit(KAIWA_EVENTS.MESSAGE_AUDIO_UPDATED, {
          conversationId: conversationId,
          messageId: messageId,
          audioUrl: audioUrl,
          role: role
        })
      } else {
        this.logger.warn(
          `[Kaiwa] [${requestId}] [Background] Audio upload failed, audioUrl is null`
        )
      }
    } catch (uploadErr) {
      this.logger.error(
        `[Kaiwa] [${requestId}] [Background] Failed to upload ${role} audio: ${uploadErr.message}`,
        uploadErr.stack
      )
    }
  }

  /**
   * Get room name cho user
   */
  private getRoomName(userId: number): string {
    return `kaiwa_${userId}`
  }

  /**
   * Update room và emit ROOM_UPDATED event (reusable) bao gồm cả levelJLPT
   */
  private async updateRoomAndEmit(
    conversationId: string,
    userId: number,
    updateData: any,
    requestId?: string
  ): Promise<void> {
    try {
      const result = await this.aiConversationRoomService.updateByConversationId(
        conversationId,
        updateData
      )
      const roomName = this.getRoomName(userId)
      this.server.to(roomName).emit(KAIWA_EVENTS.ROOM_UPDATED, {
        room: result.data,
        conversationId
      })
      if (requestId) {
        this.logger.log(
          `[Kaiwa] [${requestId}] Room updated successfully, title: "${result.data?.title || 'null'}"`
        )
      }
    } catch (err) {
      const errorMsg = requestId
        ? `[Kaiwa] [${requestId}] Failed to update room: ${err.message}`
        : `[Kaiwa] Failed to update room: ${err.message}`
      this.logger.warn(errorMsg)
    }
  }

  /**
   * Lấy language từ socket handshake headers
   */
  private getLanguageFromSocket(client: Socket): string {
    const acceptLanguage = client.handshake.headers['accept-language']

    if (!acceptLanguage) {
      return 'vi' // Default language
    }

    // Parse Accept-Language header
    // Format: "en-US,en;q=0.9,vi;q=0.8"
    const languages = acceptLanguage
      .split(',')
      .map((lang: string) => {
        const [locale, q] = lang.trim().split(';q=')
        return {
          locale: locale.split('-')[0], // Get main language code (en from en-US)
          quality: q ? parseFloat(q) : 1.0
        }
      })
      .sort((a: any, b: any) => b.quality - a.quality)

    // Find supported language
    const supportedLanguages = ['vi', 'en', 'ja']
    for (const lang of languages) {
      if (supportedLanguages.includes(lang.locale)) {
        return lang.locale
      }
    }

    return 'vi' // Default fallback
  }

  /**
   * Generate title cho conversation room từ messages bằng AI
   * @param messages - Array of messages (có thể là toàn bộ hoặc messages gần nhất)
   * @param language - Language for title generation
   * @param useLatestMessages - Nếu true, lấy messages cuối cùng (gần nhất), nếu false lấy messages đầu tiên
   */
  private async generateRoomTitle(
    messages: Array<{ role: string; text: string }>,
    language: string = 'vi',
    useLatestMessages: boolean = false
  ): Promise<string | null> {
    if (!this.genAI || !messages || messages.length === 0) {
      this.logger.warn(
        `[Kaiwa] generateRoomTitle: genAI=${!!this.genAI}, messages.length=${messages?.length || 0}`
      )
      return null
    }

    try {
      // Lấy config từ DB cho AI_KAIWA_ROOM_TITLE
      // Nghiệp vụ: Nếu không có config trong DB → dùng default values (model: gemini-2.5-flash, default prompt)
      const config = await this.getGeminiConfigForService(
        'AI_KAIWA_ROOM_TITLE' as GeminiConfigType
      )
      const dbConfigModel = config?.geminiConfigModel || null
      const modelName = (dbConfigModel?.geminiModel?.key as string) || 'gemini-2.5-flash'

      if (!config) {
        this.logger.log(
          `[Kaiwa] generateRoomTitle: Using default values (no config found in DB) - model: ${modelName}`
        )
      } else {
        this.logger.log(
          `[Kaiwa] generateRoomTitle: Using config from DB - model: ${modelName}`
        )
      }
      // Lấy messages để generate title
      // Nếu useLatestMessages = true: lấy 2-3 messages cuối cùng (nội dung gần nhất)
      // Nếu useLatestMessages = false: lấy 2-3 messages đầu tiên (nội dung ban đầu)
      let contextMessages: Array<{ role: string; text: string }>
      if (useLatestMessages) {
        // Lấy 2-3 messages cuối cùng
        contextMessages = messages.slice(-3)
        this.logger.log(
          `[Kaiwa] generateRoomTitle: Using latest ${contextMessages.length} messages (from total ${messages.length})`
        )
      } else {
        // Lấy 2-3 messages đầu tiên
        contextMessages = messages.slice(0, 3)
        this.logger.log(
          `[Kaiwa] generateRoomTitle: Using first ${contextMessages.length} messages (from total ${messages.length})`
        )
      }
      this.logger.log(
        `[Kaiwa] generateRoomTitle: Using ${contextMessages.length} messages for context`
      )

      // Tạo prompt theo ngôn ngữ (lấy từ constants)
      const { userLabel, aiLabel } = getRoomTitleLabels(language)
      const defaultPrompt = getRoomTitlePrompt(language)

      const contextText = contextMessages
        .map((m) => {
          const text = m.text || ''
          // Giới hạn độ dài mỗi message để tránh prompt quá dài
          const truncatedText = text.length > 200 ? text.substring(0, 197) + '...' : text
          return `${m.role === 'user' ? userLabel : aiLabel}: ${truncatedText}`
        })
        .join('\n')

      // Sử dụng prompt từ config nếu có, hoặc fallback về default prompt
      let finalPrompt: string
      if (config?.prompt) {
        // Thay thế placeholder trong config prompt
        finalPrompt = String(config.prompt)
          .replace(/\{\{contextMessages\}\}/g, contextText)
          .replace(/\{\{language\}\}/g, language)
      } else {
        // Fallback về default prompt
        finalPrompt = defaultPrompt + contextText
      }

      this.logger.log(
        `[Kaiwa] generateRoomTitle: Prompt length=${finalPrompt.length}, language=${language}, contextMessages=${contextMessages.length}, model=${modelName}`
      )
      this.logger.debug(
        `[Kaiwa] generateRoomTitle: Prompt preview: ${finalPrompt.substring(0, 200)}...`
      )

      // Build generationConfig từ DB config (nếu không có trong DB thì dùng default)
      const { generationConfig, systemInstruction: titleSystemInstruction } =
        this.buildGenerationConfig(
          dbConfigModel,
          getDefaultGenerationConfig('ROOM_TITLE')
        )

      // Build safetySettings từ DB config
      const safetySettings = this.buildSafetySettingsOrDefault(dbConfigModel)

      const genAIInstance = this.getGenAIForModel(modelName)
      const modelConfig: any = {
        model: modelName,
        generationConfig,
        safetySettings
      }
      // Thêm systemInstruction nếu có (cho room title, thường không cần)
      if (titleSystemInstruction) {
        modelConfig.systemInstruction = titleSystemInstruction
      }
      const model = genAIInstance.getGenerativeModel(modelConfig)

      this.logger.log(`[Kaiwa] generateRoomTitle: Calling Gemini API...`)
      const result = await model.generateContent(finalPrompt)
      const response = await result.response

      // Kiểm tra xem có bị block bởi safety filter không
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0]
        if (candidate.finishReason) {
          this.logger.log(
            `[Kaiwa] generateRoomTitle: Finish reason: ${candidate.finishReason}`
          )
          if (candidate.finishReason === 'MAX_TOKENS') {
            this.logger.warn(
              `[Kaiwa] generateRoomTitle: Hit MAX_TOKENS limit, response may be truncated`
            )
          } else if (candidate.finishReason !== 'STOP') {
            this.logger.warn(
              `[Kaiwa] generateRoomTitle: Finish reason is ${candidate.finishReason}, may be blocked`
            )
          }
        }
        if (candidate.safetyRatings && candidate.safetyRatings.length > 0) {
          this.logger.log(
            `[Kaiwa] generateRoomTitle: Safety ratings: ${JSON.stringify(candidate.safetyRatings)}`
          )
        }
      }

      // Kiểm tra response có hợp lệ không
      if (!response) {
        this.logger.warn(`[Kaiwa] generateRoomTitle: Response is null or undefined`)
        return null
      }

      let title: string = ''
      try {
        title = response.text().trim()
      } catch (textError) {
        this.logger.error(
          `[Kaiwa] generateRoomTitle: Error calling response.text(): ${textError.message}`
        )
        // Thử lấy text từ candidates trực tiếp
        try {
          const candidates = response.candidates
          if (candidates && candidates.length > 0) {
            const candidate = candidates[0]
            // Kiểm tra content.parts
            if (
              candidate.content &&
              candidate.content.parts &&
              candidate.content.parts.length > 0
            ) {
              const textPart = candidate.content.parts.find((part: any) => part.text)
              if (textPart && textPart.text) {
                title = textPart.text.trim()
                this.logger.log(
                  `[Kaiwa] generateRoomTitle: Got title from candidates.parts: "${title}"`
                )
              } else {
                this.logger.warn(
                  `[Kaiwa] generateRoomTitle:  No text in candidates[0].content.parts`
                )
              }
            } else {
              this.logger.warn(
                `[Kaiwa] generateRoomTitle: No content.parts in candidates[0]`
              )
            }
          } else {
            this.logger.warn(`[Kaiwa] generateRoomTitle: No candidates in response`)
          }
        } catch (candidateError) {
          this.logger.error(
            `[Kaiwa] generateRoomTitle: Error getting text from candidates: ${candidateError.message}`
          )
        }
      }

      // Nếu title vẫn rỗng nhưng có MAX_TOKENS, có thể response bị truncated nhưng vẫn có text
      // Thử lấy lại từ candidates một lần nữa
      if (
        (!title || title.length === 0) &&
        response.candidates &&
        response.candidates.length > 0
      ) {
        const candidate = response.candidates[0]
        if (candidate.finishReason === 'MAX_TOKENS') {
          this.logger.warn(
            `[Kaiwa] generateRoomTitle: MAX_TOKENS but title is empty, checking candidates again...`
          )
          // Log toàn bộ candidate để debug
          this.logger.debug(
            `[Kaiwa] generateRoomTitle: Candidate structure: ${JSON.stringify({
              finishReason: candidate.finishReason,
              hasContent: !!candidate.content,
              hasParts: !!(candidate.content && candidate.content.parts),
              partsLength: candidate.content?.parts?.length || 0
            })}`
          )

          // Thử lấy text từ parts một lần nữa
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              if (part.text && part.text.trim().length > 0) {
                title = part.text.trim()
                this.logger.log(
                  `[Kaiwa] generateRoomTitle: Found text in part after MAX_TOKENS check: "${title}"`
                )
                break
              }
            }
          }
        }
      }

      this.logger.log(
        `[Kaiwa] generateRoomTitle: Raw response from Gemini: "${title}" (length: ${title?.length || 0})`
      )

      // Giới hạn độ dài title
      if (title && title.length > 0) {
        // Loại bỏ các ký tự không hợp lệ (như markdown formatting, quotes, etc.)
        title = title
          .replace(/^\*\*|\*\*$/g, '') // Remove **
          .replace(/^#+\s*/, '') // Remove # headers
          .replace(/^["']|["']$/g, '') // Remove quotes
          .replace(/^Tiêu đề:\s*/i, '') // Remove "Tiêu đề:" prefix
          .replace(/^Title:\s*/i, '') // Remove "Title:" prefix
          .trim()

        if (title.length > 0) {
          const finalTitle = title.length > 50 ? title.substring(0, 47) + '...' : title
          this.logger.log(`[Kaiwa] generateRoomTitle: Final title: "${finalTitle}"`)
          return finalTitle
        }
      }

      // Fallback: Tạo title đơn giản từ message đầu tiên nếu Gemini trả về empty
      this.logger.warn(`[Kaiwa] generateRoomTitle: Title is empty, using fallback`)
      if (messages.length >= 2) {
        const firstUserMessage = messages.find((m) => m.role === 'user')?.text || ''
        const firstAIMessage = messages.find((m) => m.role === 'model')?.text || ''

        // Tạo title đơn giản từ nội dung
        let fallbackTitle = ''
        if (firstUserMessage) {
          const shortText =
            firstUserMessage.length > 30
              ? firstUserMessage.substring(0, 27) + '...'
              : firstUserMessage
          fallbackTitle = `Hội thoại: ${shortText}`
        } else if (firstAIMessage) {
          const shortText =
            firstAIMessage.length > 30
              ? firstAIMessage.substring(0, 27) + '...'
              : firstAIMessage
          fallbackTitle = `Hội thoại: ${shortText}`
        } else {
          fallbackTitle = 'Cuộc trò chuyện mới'
        }

        this.logger.log(
          `[Kaiwa] generateRoomTitle: Using fallback title: "${fallbackTitle}"`
        )
        return fallbackTitle.length > 50
          ? fallbackTitle.substring(0, 47) + '...'
          : fallbackTitle
      }

      this.logger.warn(`[Kaiwa] generateRoomTitle: Title is empty or invalid: "${title}"`)
      return null
    } catch (error) {
      this.logger.error(
        `[Kaiwa] Failed to generate room title: ${error.message}`,
        error.stack
      )
      return null
    }
  }

  /**
   * Handle sự kiện user-audio-chunk
   * Flow: Audio -> Speech-to-Text -> Gemini 2.5 -> Text-to-Speech -> Audio Response
   */
  @SubscribeMessage(KAIWA_EVENTS.USER_AUDIO_CHUNK)
  async handleUserAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any
  ): Promise<void> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.logger.log(`[Kaiwa] [${requestId}] Starting audio processing`)

    // Log chi tiết về payload nhận được
    this.logger.log(
      `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] Payload received - type: ${typeof payload}, isNull: ${payload === null}, isUndefined: ${payload === undefined}`
    )
    if (payload !== null && payload !== undefined) {
      if (Buffer.isBuffer(payload)) {
        this.logger.log(
          `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] Payload is Buffer, size: ${payload.length} bytes`
        )
        if (payload.length > 0) {
          const headerBytes = payload.slice(0, Math.min(12, payload.length))
          this.logger.log(
            `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] Buffer header (first 12 bytes): ${headerBytes.toString('hex')}`
          )
        } else {
          this.logger.warn(
            `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] WARNING: Buffer is empty (0 bytes)`
          )
        }
      } else if (payload instanceof Uint8Array) {
        this.logger.log(
          `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] Payload is Uint8Array, size: ${payload.length} bytes`
        )
        if (payload.length > 0) {
          const headerBytes = Array.from(payload.slice(0, Math.min(12, payload.length)))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
          this.logger.log(
            `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] Uint8Array header (first 12 bytes): ${headerBytes}`
          )
        } else {
          this.logger.warn(
            `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] WARNING: Uint8Array is empty (0 bytes)`
          )
        }
      } else if (typeof payload === 'object') {
        this.logger.log(
          `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] Payload is object, keys: ${Object.keys(payload).join(', ')}`
        )
        if (payload.audio) {
          if (Buffer.isBuffer(payload.audio)) {
            this.logger.log(
              `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] payload.audio is Buffer, size: ${payload.audio.length} bytes`
            )
          } else if (payload.audio instanceof Uint8Array) {
            this.logger.log(
              `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] payload.audio is Uint8Array, size: ${payload.audio.length} bytes`
            )
          } else {
            this.logger.warn(
              `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] payload.audio is ${typeof payload.audio}, not Buffer/Uint8Array`
            )
          }
        } else {
          this.logger.warn(
            `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] Payload object does not have 'audio' field`
          )
        }
        if (payload.format) {
          this.logger.log(
            `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] Payload format: ${payload.format}`
          )
        }
        if (payload.mimeType) {
          this.logger.log(
            `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] Payload mimeType: ${payload.mimeType}`
          )
        }
      } else if (typeof payload === 'string') {
        this.logger.log(
          `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] Payload is string (likely base64), length: ${payload.length} chars`
        )
        try {
          const decodedLength = Buffer.from(payload, 'base64').length
          this.logger.log(
            `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] Decoded base64 size: ${decodedLength} bytes`
          )
        } catch (e) {
          this.logger.warn(
            `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] Failed to decode base64: ${e.message}`
          )
        }
      } else {
        this.logger.warn(
          `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] Payload is unknown type: ${typeof payload}`
        )
      }
    } else {
      this.logger.error(
        `[Kaiwa] [${requestId}] [AUDIO_RECEIVE] ERROR: Payload is null or undefined - NO AUDIO DATA RECEIVED`
      )
    }

    try {
      const userId = client.data?.userId

      //#region Validate client data
      if (!userId) {
        this.logger.warn(`[Kaiwa] [${requestId}] No userId found for client ${client.id}`)
        client.emit(KAIWA_EVENTS.ERROR, { message: ErrorMessage.MISSING_USER_ID })
        return
      }

      // Tạo conversationId nếu chưa có
      if (!client.data.conversationId) {
        client.data.conversationId = `conv_${userId}_${Date.now()}`
        this.logger.log(
          `[Kaiwa] [${requestId}] Created conversationId: ${client.data.conversationId} for user ${userId}`
        )
      }

      // Kiểm tra xem có request khác đang xử lý không chỉ log warning
      if (client.data.processingAudio) {
        this.logger.warn(
          `[Kaiwa] [${requestId}] Previous audio request still processing, queuing this one`
        )
      }
      client.data.processingAudio = true

      // Kiểm tra Gemini API không khởi tạo
      if (!this.genAI) {
        client.emit(KAIWA_EVENTS.ERROR, {
          message: ErrorMessage.GEMINI_API_NOT_INITIALIZED,
          suggestion: ErrorMessage.GEMINI_API_KEY_NOT_SET
        })
        return
      }
      //#endregion

      // Parse audio payload và detect format
      const { audioBuffer, audioFormat, mimeType } = this.parseAudioPayload(
        payload,
        requestId
      )

      this.logger.log(
        `[Kaiwa] [${requestId}] [AUDIO_READY] Received audio chunk: ${audioBuffer.length} bytes from user ${userId}, conversationId: ${client.data.conversationId}, detected format: ${audioFormat}, mimeType: ${mimeType}`
      )

      // Validate audio buffer trước khi xử lý
      if (!audioBuffer || audioBuffer.length === 0) {
        this.logger.error(
          `[Kaiwa] [${requestId}] [AUDIO_READY] ERROR: Audio buffer is empty or null - CANNOT PROCESS`
        )
        client.data.processingAudio = false
        client.emit(KAIWA_EVENTS.ERROR, {
          message: ErrorMessage.SPEECH_RECOGNITION_FAILED,
          suggestion:
            'Không nhận được dữ liệu âm thanh. Vui lòng kiểm tra microphone và thử lại.'
        })
        return
      }

      // Log chi tiết về audio buffer trước khi gửi vào Speech-to-Text
      this.logger.log(
        `[Kaiwa] [${requestId}] [AUDIO_READY] Audio buffer validation: size=${audioBuffer.length} bytes, isValid=${audioBuffer.length > 0}, format=${audioFormat}, mimeType=${mimeType}`
      )
      if (audioBuffer.length > 0) {
        const sampleBytes = audioBuffer.slice(0, Math.min(16, audioBuffer.length))
        this.logger.log(
          `[Kaiwa] [${requestId}] [AUDIO_READY] Audio buffer sample (first 16 bytes): ${sampleBytes.toString('hex')}`
        )
      }

      // Step 1: Speech-to-Text (Audio -> Text)
      let transcription: string
      try {
        this.logger.log(
          `[Kaiwa] [${requestId}] [SPEECH_TO_TEXT] Starting Speech-to-Text processing with buffer size: ${audioBuffer.length} bytes, format: ${audioFormat}`
        )
        //Chuyển đổi âm thanh thành văn bản của user
        transcription = await this.processSpeechToText(
          audioBuffer,
          audioFormat,
          requestId,
          client
        )
      } catch (speechError) {
        this.logger.error(
          `[Kaiwa] [${requestId}] Speech-to-Text error: ${speechError.message}`,
          speechError.stack
        )

        // Log chi tiết về format nếu là MP4/M4A (không được hỗ trợ trực tiếp)
        if (audioFormat === 'MP4' || audioFormat === 'M4A') {
          this.logger.error(
            `[Kaiwa] [${requestId}] [SPEECH_TO_TEXT] ERROR: MP4/M4A format is not directly supported by Google Speech-to-Text API via content base64. Audio format: ${audioFormat}, buffer size: ${audioBuffer.length} bytes. Solution: Convert MP4 to FLAC or WAV (LINEAR16) before sending.`
          )
        }

        client.data.processingAudio = false
        client.emit(KAIWA_EVENTS.ERROR, {
          message: `${ErrorMessage.SPEECH_CONVERSION_ERROR}: ${speechError.message}`,
          suggestion:
            audioFormat === 'MP4' || audioFormat === 'M4A'
              ? 'Định dạng MP4/M4A không được hỗ trợ trực tiếp. Vui lòng sử dụng định dạng FLAC hoặc WAV.'
              : ErrorMessage.CHECK_MICROPHONE_SUGGESTION
        })
        return
      }

      // Lấy conversation history trước
      let conversationHistory = client.data.conversationHistory || []

      // Lưu USER message vào database NGAY LẬP TỨC (không đợi upload audio)
      // Upload audio sẽ chạy trong background và update audioUrl sau
      // Sử dụng Promise để đảm bảo message được lưu trước khi upload
      this.userAIConversationService
        .create({
          userId,
          conversationId: client.data.conversationId,
          role: 'USER',
          message: transcription,
          audioUrl: null // Sẽ update sau khi upload xong
        })
        .then(async (result) => {
          const userMessageId = result.data?.id || null
          this.logger.log(
            `[Kaiwa] [${requestId}] Saved USER message (ID: ${userMessageId}), starting background audio upload...`
          )

          // Upload audio trong background (fire and forget, không block main flow)
          ;(async () => {
            await this.uploadAndUpdateMessageAudio(
              audioBuffer,
              audioFormat,
              userMessageId,
              'USER',
              userId,
              client.data.conversationId,
              requestId,
              client,
              'kaiwa/audio/user'
            )
          })().catch((err) => {
            this.logger.error(
              `[Kaiwa] [${requestId}] [Background] User audio upload promise error: ${err.message}`,
              err.stack
            )
          })
        })
        .catch((err) => {
          this.logger.error(
            `[Kaiwa] [${requestId}] Failed to save USER message: ${err.message}`,
            err.stack
          )
        })

      // Update room với lastMessage (async, không block)
      // Chỉ update lastMessage, title sẽ được generate sau khi có AI response
      this.updateRoomAndEmit(
        client.data.conversationId,
        userId,
        {
          lastMessage:
            transcription.length > 500 ? transcription.substring(0, 500) : transcription,
          lastMessageAt: new Date()
        },
        requestId
      ).catch(() => {}) // Fire and forget

      // Step 2: Gửi text đến Gemini Flash (chạy song song với các task khác nếu có thể)
      // Lấy config từ DB cho AI_KAIWA
      // Nghiệp vụ: Nếu không có config trong DB → dùng default values (model: gemini-2.5-flash, default systemPrompt)
      const kaiwaConfig = await this.getGeminiConfigForService(
        'AI_KAIWA' as GeminiConfigType
      )
      const kaiwaDbConfigModel = kaiwaConfig?.geminiConfigModel || null
      const kaiwaModelName =
        (kaiwaDbConfigModel?.geminiModel?.key as string) || 'gemini-2.5-flash'

      // Build prompt cho kaiwa (đàm thoại tiếng Nhật)
      // Sử dụng prompt từ config nếu có, hoặc fallback về default từ constants
      const baseSystemPrompt = kaiwaConfig?.prompt
        ? String(kaiwaConfig.prompt)
        : DEFAULT_KAIWA_SYSTEM_PROMPT

      // Lấy levelJLPT của user để điều chỉnh trình độ nói chuyện
      const levelJLPT = await this.getUserLevelJLPT(client, userId)

      // Build system prompt với levelJLPT (sử dụng function từ constants)
      const systemPrompt = buildSystemPromptWithLevel(baseSystemPrompt, levelJLPT)

      if (!kaiwaConfig) {
        this.logger.log(
          `[Kaiwa] [${requestId}] AI_KAIWA: Using default values (no config found in DB) - model: ${kaiwaModelName}, using default systemPrompt, levelJLPT: ${levelJLPT || 'not set'}`
        )
      } else {
        this.logger.log(
          `[Kaiwa] [${requestId}] AI_KAIWA: Using config from DB - model: ${kaiwaModelName}, hasCustomPrompt: ${!!kaiwaConfig.prompt}, levelJLPT: ${levelJLPT || 'not set'}`
        )
      }

      // Build conversation history cho chat (nếu dùng startChat) hoặc prompt (nếu dùng generateContent)
      const history = conversationHistory.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }))

      // User message hiện tại
      const currentUserMessage = transcription

      // Log để debug
      this.logger.debug(
        `[Kaiwa] [${requestId}] System prompt: ${systemPrompt.substring(0, 100)}...`
      )
      this.logger.debug(
        `[Kaiwa] [${requestId}] Conversation history length: ${conversationHistory.length}`
      )
      this.logger.debug(`[Kaiwa] [${requestId}] Transcription: "${transcription}"`)
      this.logger.debug(`[Kaiwa] [${requestId}] Using model: ${kaiwaModelName}`)
      this.logger.debug(
        `[Kaiwa] [${requestId}] Has systemInstruction from config: ${!!kaiwaDbConfigModel?.systemInstruction}`
      )

      // Emit processing status
      client.emit(KAIWA_EVENTS.PROCESSING, {
        conversationId: client.data.conversationId,
        status: 'gemini-processing',
        message: 'Đang xử lý với AI...'
      })

      // Tạo tất cả promises để chạy song song
      const geminiPromise = (async () => {
        if (!this.genAI) {
          throw new Error('Gemini API not initialized')
        }

        // Build generationConfig từ DB config (nếu không có trong DB thì dùng default)
        const { generationConfig, systemInstruction: kaiwaSystemInstruction } =
          this.buildGenerationConfig(
            kaiwaDbConfigModel,
            getDefaultGenerationConfig('AI_KAIWA')
          )

        // Build safetySettings từ DB config
        const safetySettings = this.buildSafetySettingsOrDefault(kaiwaDbConfigModel)

        const genAIInstance = this.getGenAIForModel(kaiwaModelName)

        // Tạo model với config cơ bản (KHÔNG set systemInstruction ở đây)
        const model = genAIInstance.getGenerativeModel({
          model: kaiwaModelName,
          generationConfig,
          safetySettings
          // KHÔNG set systemInstruction ở đây để tránh conflict với startChat
        })

        // Dùng startChat với systemInstruction và history
        // Lưu ý: Một số model (như gemini-2.5-flash) có thể không hỗ trợ systemInstruction trong startChat
        // Nếu lỗi, sẽ fallback về generateContent
        let result: any
        try {
          if (kaiwaSystemInstruction || systemPrompt) {
            // Thử dùng startChat với systemInstruction (tốt hơn cho conversation)
            const chat = model.startChat({
              history: history as any,
              systemInstruction: kaiwaSystemInstruction || systemPrompt
            })
            result = await chat.sendMessage(currentUserMessage as any)
          } else {
            // Không có systemInstruction, dùng generateContent với fullPrompt
            let fullPrompt = systemPrompt + '\n\n'
            conversationHistory.forEach((msg: any) => {
              if (msg.role === 'user') {
                fullPrompt += `Người học: ${msg.text}\n`
              } else if (msg.role === 'model') {
                fullPrompt += `Bạn: ${msg.text}\n`
              }
            })
            fullPrompt += `Người học: ${transcription}\nBạn:`
            result = await model.generateContent(fullPrompt)
          }
        } catch (startChatError: any) {
          // Fallback: Nếu startChat lỗi (ví dụ: model không hỗ trợ systemInstruction trong startChat)
          // Thì dùng generateContent với systemInstruction trong getGenerativeModel
          this.logger.warn(
            `[Kaiwa] [${requestId}] startChat failed, falling back to generateContent: ${startChatError.message}`
          )

          // Tạo model mới với systemInstruction trong getGenerativeModel
          const fallbackModel = genAIInstance.getGenerativeModel({
            model: kaiwaModelName,
            generationConfig,
            safetySettings,
            systemInstruction: kaiwaSystemInstruction || systemPrompt
          })

          // Dùng generateContent với fullPrompt
          let fullPrompt = (kaiwaSystemInstruction || systemPrompt) + '\n\n'
          conversationHistory.forEach((msg: any) => {
            if (msg.role === 'user') {
              fullPrompt += `Người học: ${msg.text}\n`
            } else if (msg.role === 'model') {
              fullPrompt += `Bạn: ${msg.text}\n`
            }
          })
          fullPrompt += `Người học: ${transcription}\nBạn:`
          result = await fallbackModel.generateContent(fullPrompt)
        }
        const response = await result.response

        // Kiểm tra xem có bị block bởi safety filter không
        let candidate: any = null
        if (response.candidates && response.candidates.length > 0) {
          candidate = response.candidates[0]
          if (candidate.finishReason === 'SAFETY') {
            this.logger.warn(
              `[Kaiwa] Gemini response blocked by safety filter. Finish reason: ${candidate.finishReason}`
            )
            throw new Error('Response blocked by safety filter')
          }
          if (candidate.finishReason === 'MAX_TOKENS') {
            this.logger.warn(
              `[Kaiwa] Gemini response truncated due to MAX_TOKENS - will try to extract text from candidates`
            )
          }
        } else {
          this.logger.warn(`[Kaiwa] Gemini response has no candidates`)
        }

        let text: string = ''
        try {
          text = response.text()
        } catch (textError) {
          this.logger.warn(
            `[Kaiwa] Error calling response.text(): ${textError.message} - will try to extract from candidates`
          )
        }

        // Nếu text vẫn empty hoặc khi MAX_TOKENS, thử lấy text từ candidates trực tiếp
        if ((!text || text.trim() === '') && candidate) {
          if (candidate.content && candidate.content.parts) {
            text = candidate.content.parts
              .map((part: any) => {
                // Kiểm tra xem part có text không
                if (part.text) {
                  return part.text
                }
                // Hoặc có thể là object với text property
                if (typeof part === 'object' && part.text) {
                  return part.text
                }
                return ''
              })
              .filter((t: string) => t && t.trim().length > 0)
              .join('')

            if (text && text.trim().length > 0) {
              this.logger.log(
                `[Kaiwa] Successfully extracted text from candidates (${text.length} chars)`
              )
            }
          }
        }

        // Log full response để debug
        this.logger.debug(`[Kaiwa] Gemini raw response: "${text}"`)
        this.logger.debug(`[Kaiwa] Gemini response length: ${text?.length || 0}`)
        if (response.candidates && response.candidates.length > 0) {
          this.logger.debug(
            `[Kaiwa] Gemini finish reason: ${response.candidates[0].finishReason}`
          )
        }

        // Fallback nếu Gemini trả về rỗng/không hợp lệ
        const fallbackReply = 'すみません、もう一度お願いします。'
        if (!text || text.trim() === '') {
          this.logger.warn(
            `[Kaiwa] Gemini returned empty or whitespace-only response. Using fallback reply.`
          )
          return fallbackReply
        }

        // Kiểm tra nếu response chỉ là "..." hoặc quá ngắn
        const trimmedText = text.trim()
        if (trimmedText === '...' || trimmedText.length < 2) {
          this.logger.warn(
            `[Kaiwa] Gemini returned invalid response: "${trimmedText}". Using fallback reply.`
          )
          return fallbackReply
        }

        return trimmedText
      })()

      // Chờ Gemini response với timeout (15 giây)
      let geminiResponse: string
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Gemini API timeout sau 15 giây')), 15000)
        })

        geminiResponse = await Promise.race([geminiPromise, timeoutPromise])
        this.logger.log(
          `[Kaiwa] [${requestId}] Gemini response: "${geminiResponse.substring(0, 100)}..." (length: ${geminiResponse.length})`
        )

        if (!geminiResponse || geminiResponse.trim() === '') {
          this.logger.error(`[Kaiwa] [${requestId}] Gemini returned empty response`)
          throw new Error('Gemini returned empty response')
        }

        // Kiểm tra lại sau khi đã log
        if (geminiResponse.trim() === '...' || geminiResponse.trim().length < 2) {
          this.logger.error(
            `[Kaiwa] [${requestId}] Gemini returned invalid response: "${geminiResponse.trim()}"`
          )
          throw new Error(`Gemini returned invalid response: "${geminiResponse.trim()}"`)
        }

        // Lưu conversation history
        conversationHistory.push(
          { role: 'user', text: transcription },
          { role: 'model', text: geminiResponse }
        )
        if (conversationHistory.length > 10) {
          conversationHistory.shift()
          conversationHistory.shift()
        }
        client.data.conversationHistory = conversationHistory
        this.logger.log(
          `[Kaiwa] [${requestId}] Updated conversationHistory: ${conversationHistory.length} messages`
        )
      } catch (geminiError) {
        this.logger.error(
          `[Kaiwa] [${requestId}] Gemini API error: ${geminiError.message}`,
          geminiError.stack
        )
        client.data.processingAudio = false
        client.emit(KAIWA_EVENTS.ERROR, {
          message: `${ErrorMessage.AI_ERROR}: ${geminiError.message}`,
          suggestion: ErrorMessage.CHECK_GEMINI_API_KEY_SUGGESTION
        })
        return
      }

      // Emit text response ngay lập tức (chỉ có Japanese)
      client.emit(KAIWA_EVENTS.TEXT_RESPONSE, {
        conversationId: client.data.conversationId,
        text: geminiResponse,
        translation: '',
        timestamp: Date.now()
      })

      // Lưu AI response vào database (audioUrl sẽ được update sau khi có TTS)
      // Tạm thời lưu không có audioUrl, sẽ update sau khi upload TTS audio
      let aiMessageId: number | null = null
      this.userAIConversationService
        .create({
          userId,
          conversationId: client.data.conversationId,
          role: 'AI',
          message: geminiResponse,
          audioUrl: null // Sẽ update sau khi có TTS audio
        })
        .then((result) => {
          // Lưu message ID để update audioUrl sau
          aiMessageId = result.data?.id || null
          this.logger.log(
            `[Kaiwa] [${requestId}] Saved AI message (ID: ${aiMessageId}), waiting for TTS audio...`
          )
        })
        .catch((err) => {
          this.logger.warn(
            `[Kaiwa] [${requestId}] Failed to save AI message: ${err.message}`
          )
        })

      // Update room với lastMessage từ AI (async, không block)
      // Cũng check và generate title nếu chưa có (có thể đã generate ở USER message, nhưng check lại để chắc chắn)
      // conversationHistory đã được update với cả user và AI message ở trên
      this.aiConversationRoomService
        .findByConversationId(client.data.conversationId, userId)
        .then(async (roomResult) => {
          let room = roomResult?.data

          // Nếu room chưa tồn tại, tạo mới trước
          if (!room) {
            this.logger.log(
              `[Kaiwa] [${requestId}] Room not found, creating new room for conversationId: ${client.data.conversationId}`
            )
            try {
              const createResult = await this.aiConversationRoomService.create({
                userId,
                conversationId: client.data.conversationId,
                title: null,
                voiceName: client.data.voiceName || 'ja-JP-Wavenet-A'
              })
              room = createResult.data
              this.logger.log(`[Kaiwa] [${requestId}] Room created successfully`)
            } catch (createErr) {
              this.logger.error(
                `[Kaiwa] [${requestId}] Failed to create room: ${createErr.message}`,
                createErr.stack
              )
              throw createErr
            }
          }

          // Chỉ generate title một lần khi chưa có title
          // Chờ đến khi có đủ 4-6 messages để có context tốt nhất
          const currentHistory = client.data.conversationHistory || conversationHistory
          this.logger.log(
            `[Kaiwa] [${requestId}] Current history from client.data: ${currentHistory.length} messages, local conversationHistory: ${conversationHistory.length} messages`
          )

          const updateData: any = {
            lastMessage:
              geminiResponse.length > 500
                ? geminiResponse.substring(0, 500)
                : geminiResponse,
            lastMessageAt: new Date()
          }

          // Chỉ generate title nếu:
          // 1. Room chưa có title (null hoặc empty)
          // 2. Có đủ ít nhất 4 messages (để có context tốt)
          // 3. Không quá 6 messages (để tránh prompt quá dài)
          const needsTitle =
            !room.title || (typeof room.title === 'string' && room.title.trim() === '')
          const hasEnoughMessages = currentHistory.length >= 4
          const notTooManyMessages = currentHistory.length <= 6

          if (needsTitle && hasEnoughMessages && notTooManyMessages) {
            const language = client.data.language || 'vi'
            this.logger.log(
              `[Kaiwa] [${requestId}] Generating title for the first time (lang: ${language}, messages: ${currentHistory.length})`
            )
            try {
              // Sử dụng messages đầu tiên (4-6 messages) để có context ban đầu tốt nhất
              const generatedTitle = await this.generateRoomTitle(
                currentHistory,
                language,
                false
              )
              if (generatedTitle) {
                updateData.title = generatedTitle
                this.logger.log(
                  `[Kaiwa] [${requestId}] Generated title (lang: ${language}): "${generatedTitle}"`
                )
              } else {
                this.logger.warn(`[Kaiwa] [${requestId}] generateRoomTitle returned null`)
              }
            } catch (titleError) {
              this.logger.error(
                `[Kaiwa] [${requestId}] Error generating title: ${titleError.message}`,
                titleError.stack
              )
            }
          } else if (needsTitle) {
            if (currentHistory.length < 4) {
              this.logger.log(
                `[Kaiwa] [${requestId}] Waiting for more messages before generating title (${currentHistory.length}/4)`
              )
            } else if (currentHistory.length > 6) {
              this.logger.log(
                `[Kaiwa] [${requestId}] Too many messages (${currentHistory.length}), skipping title generation`
              )
            }
          } else {
            this.logger.log(
              `[Kaiwa] [${requestId}] Title already exists: "${room.title}", skipping generation`
            )
          }

          this.logger.log(
            `[Kaiwa] [${requestId}] Updating room with data: ${JSON.stringify({ ...updateData, lastMessage: updateData.lastMessage?.substring(0, 50) + '...' })}`
          )
          return this.updateRoomAndEmit(
            client.data.conversationId,
            userId,
            updateData,
            requestId
          )
        })
        .catch((err) => {
          this.logger.error(
            `[Kaiwa] [${requestId}] Failed to update room with AI message: ${err.message}`,
            err.stack
          )
        })

      // Step 3 & 4: Translation và TTS chạy song song HOÀN TOÀN và emit ngay khi có (streaming)
      // Không đợi Promise.all() - mỗi task tự emit khi xong
      const genAIInstance = this.genAI // Capture để tránh null check
      if (genAIInstance) {
        // Translation - emit ngay khi có
        ;(async () => {
          try {
            // Lấy config từ DB cho AI_KAIWA_TRANSLATION
            // Nghiệp vụ: Nếu không có config trong DB → dùng default values (model: gemini-2.5-flash, default prompt)
            const translationConfig = await this.getGeminiConfigForService(
              'AI_KAIWA_TRANSLATION' as GeminiConfigType
            )
            const translationDbConfigModel = translationConfig?.geminiConfigModel || null
            const translationModelName =
              (translationDbConfigModel?.geminiModel?.key as string) || 'gemini-2.5-flash'

            // Build prompt từ config hoặc default
            const defaultTranslatePrompt = `Hãy dịch câu tiếng Nhật sau sang tiếng Việt một cách tự nhiên và chính xác:\n\n${geminiResponse}\n\nChỉ trả lời bằng bản dịch tiếng Việt, không thêm gì khác.`
            const translatePrompt = translationConfig?.prompt
              ? String(translationConfig.prompt).replace(/\{\{text\}\}/g, geminiResponse)
              : defaultTranslatePrompt

            if (!translationConfig) {
              this.logger.debug(
                `[Kaiwa] [${requestId}] AI_KAIWA_TRANSLATION: Using default values (no config found in DB) - model: ${translationModelName}`
              )
            } else {
              this.logger.debug(
                `[Kaiwa] [${requestId}] AI_KAIWA_TRANSLATION: Using config from DB - model: ${translationModelName}`
              )
            }

            // Build generationConfig từ DB config (nếu không có trong DB thì dùng default)
            const { generationConfig, systemInstruction: translationSystemInstruction } =
              this.buildGenerationConfig(
                translationDbConfigModel,
                getDefaultGenerationConfig('TRANSLATION')
              )

            // Build safetySettings từ DB config
            const safetySettings = this.buildSafetySettingsOrDefault(
              translationDbConfigModel
            )

            const translateGenAI = this.getGenAIForModel(translationModelName)
            const translateModelConfig: any = {
              model: translationModelName,
              generationConfig,
              safetySettings
            }
            // Thêm systemInstruction nếu có (cho translation, thường không cần)
            if (translationSystemInstruction) {
              translateModelConfig.systemInstruction = translationSystemInstruction
            }
            const translateModel = translateGenAI.getGenerativeModel(translateModelConfig)
            const translateResult = await translateModel.generateContent(translatePrompt)
            const translateResponse = await translateResult.response
            const translation = translateResponse.text().trim()

            this.logger.log(
              `[Kaiwa] [${requestId}] Vietnamese translation: "${translation.substring(0, 100)}..." (model: ${translationModelName})`
            )
            client.emit(KAIWA_EVENTS.TEXT_RESPONSE_UPDATE, {
              conversationId: client.data.conversationId,
              translation: translation
            })
          } catch (translateError) {
            this.logger.warn(
              `[Kaiwa] [${requestId}] Translation error: ${translateError.message}`
            )
          }
        })().catch((err) => {
          this.logger.error(
            `[Kaiwa] [${requestId}] Translation promise error: ${err.message}`,
            err.stack
          )
        })
      }

      // TTS - emit ngay khi có (chỉ nếu có text hợp lệ)
      if (geminiResponse && geminiResponse.trim().length > 0) {
        ;(async () => {
          try {
            // Lấy voiceName từ room hoặc client.data hoặc dùng default
            let voiceName = 'ja-JP-Wavenet-A'
            try {
              const roomResult =
                await this.aiConversationRoomService.findByConversationId(
                  client.data.conversationId,
                  userId
                )
              if (roomResult?.data?.voiceName) {
                voiceName = roomResult.data.voiceName
              } else if (client.data.voiceName) {
                voiceName = client.data.voiceName
              }
            } catch (err) {
              this.logger.warn(
                `[Kaiwa] [${requestId}] Failed to get voiceName from room, using default: ${err.message}`
              )
            }

            this.logger.log(
              `[Kaiwa] [${requestId}] Starting TTS for text: "${geminiResponse.substring(0, 50)}..." (length: ${geminiResponse.length}) with voice: ${voiceName}`
            )
            const result = await this.textToSpeechService.convertTextToSpeech(
              geminiResponse,
              {
                languageCode: 'ja-JP',
                voiceName: voiceName,
                audioEncoding: 'OGG_OPUS', // Đổi từ MP3 sang OGG_OPUS
                speakingRate: 1.0,
                pitch: 0.0
              }
            )

            if (!result || !result.audioContent || result.audioContent.length === 0) {
              this.logger.error(`[Kaiwa] [${requestId}] TTS returned empty audio content`)
              client.emit(KAIWA_EVENTS.ERROR, {
                message: ErrorMessage.AUDIO_RESPONSE_FAILED,
                suggestion: ErrorMessage.AUDIO_NOT_AVAILABLE_SUGGESTION
              })
              client.data.processingAudio = false
              return
            }

            const audioBase64 = result.audioContent.toString('base64')
            this.logger.log(
              `[Kaiwa] [${requestId}] Text-to-Speech completed: ${result.audioContent.length} bytes`
            )
            client.emit(KAIWA_EVENTS.AUDIO_RESPONSE, {
              conversationId: client.data.conversationId,
              audio: audioBase64,
              audioFormat: 'ogg', // Đổi từ mp3 sang ogg (OGG_OPUS)
              text: geminiResponse,
              timestamp: Date.now()
            })

            // Upload AI audio trong BACKGROUND (fire and forget, không block response)
            ;(async () => {
              await this.uploadAndUpdateMessageAudio(
                result.audioContent,
                'OGG', // AI audio luôn là OGG_OPUS
                aiMessageId,
                'AI',
                userId,
                client.data.conversationId,
                requestId,
                client,
                'kaiwa/audio/ai'
              )
            })().catch((err) => {
              this.logger.error(
                `[Kaiwa] [${requestId}] [Background] AI audio upload promise error: ${err.message}`,
                err.stack
              )
            })

            client.data.processingAudio = false
            this.logger.log(
              `[Kaiwa] [${requestId}] Audio processing completed successfully`
            )
          } catch (ttsError) {
            this.logger.error(
              `[Kaiwa] [${requestId}] Text-to-Speech error: ${ttsError.message}`,
              ttsError.stack
            )
            client.data.processingAudio = false
            client.emit(KAIWA_EVENTS.ERROR, {
              message: ErrorMessage.AUDIO_RESPONSE_FAILED,
              suggestion: ErrorMessage.AUDIO_NOT_AVAILABLE_SUGGESTION
            })
          }
        })().catch((err) => {
          this.logger.error(
            `[Kaiwa] [${requestId}] TTS promise error: ${err.message}`,
            err.stack
          )
          client.data.processingAudio = false
        })
      } else {
        this.logger.error(
          `[Kaiwa] [${requestId}] Skipping TTS - geminiResponse is empty or invalid: "${geminiResponse}"`
        )
        client.data.processingAudio = false
      }
    } catch (error) {
      this.logger.error(
        `[Kaiwa] [${requestId || 'unknown'}] Error handling user audio chunk: ${error.message}`,
        error.stack
      )
      if (client.data) {
        client.data.processingAudio = false
      }
      client.emit(KAIWA_EVENTS.ERROR, {
        message: `${ErrorMessage.PROCESS_AUDIO_FAILED}: ${error.message}`
      })
    }
  }

  /**
   * Load conversation history và generate title nếu cần
   * Được gọi khi user join room cũ với conversationId
   * @param conversationId - Conversation ID cần load
   * @param userId - User ID
   * @param client - Socket client để emit events
   * @param language - Language cho title generation
   */
  private loadConversationHistoryAndGenerateTitle(
    conversationId: string,
    userId: number,
    client: Socket,
    language: string
  ): void {
    // Load lịch sử async (không block)
    this.userAIConversationService
      .findByConversationId(conversationId, userId)
      .then(async (res) => {
        const messages = (res.data || []) as Array<any>
        if (messages.length > 0) {
          // Map lịch sử vào memory cho prompt tiếp theo
          const history = messages.map((m) => ({
            role: m.role === 'USER' ? 'user' : 'model',
            text: m.message
          }))
          client.data.conversationHistory = history

          // Emit history về FE để render ngay
          client.emit(KAIWA_EVENTS.HISTORY, {
            conversationId: conversationId,
            messages: messages.map((m) => ({
              role: m.role,
              message: m.message,
              audioUrl: m.audioUrl,
              createdAt: m.createdAt
            }))
          })

          // Chỉ generate title khi join room cũ nếu chưa có title
          // Không update title nếu đã có (để tránh thay đổi title đã được tạo)
          // Nếu có đủ 4-6 messages thì generate title
          if (history.length >= 4 && history.length <= 6) {
            try {
              const roomResult =
                await this.aiConversationRoomService.findByConversationId(
                  conversationId,
                  userId
                )
              const room = roomResult?.data
              // Nếu không có room hoặc title là empty thì generate title
              const needsTitle =
                !room ||
                !room.title ||
                (typeof room.title === 'string' && room.title.trim() === '')

              if (needsTitle) {
                this.logger.log(
                  `[Kaiwa] Room ${conversationId} has ${history.length} messages but no title, generating title...`
                )
                // Sử dụng messages đầu tiên để có context ban đầu tốt nhất để generate title
                const generatedTitle = await this.generateRoomTitle(
                  history,
                  language,
                  false
                )
                if (generatedTitle) {
                  // Cập nhật title và emit ROOM_UPDATED event
                  await this.updateRoomAndEmit(conversationId, userId, {
                    title: generatedTitle
                  })
                  this.logger.log(
                    `[Kaiwa] Generated title for room ${conversationId}: "${generatedTitle}"`
                  )
                } else {
                  this.logger.warn(
                    `[Kaiwa] Failed to generate title for room ${conversationId}`
                  )
                }
              } else {
                this.logger.log(
                  `[Kaiwa] Room ${conversationId} already has title: "${room?.title}", skipping generation`
                )
              }
            } catch (titleErr) {
              this.logger.warn(
                `[Kaiwa] Failed to generate title for existing room ${conversationId}: ${titleErr.message}`
              )
            }
          }
        }
      })
      .catch((err) => {
        this.logger.warn(
          `[Kaiwa] Failed to load history for conversationId ${conversationId}: ${err.message}`
        )
        // Giữ nguyên conversationId, chỉ log warning
      })
  }

  /**
   * Join kaiwa room
   */
  @SubscribeMessage(KAIWA_EVENTS.JOIN_KAIWA_ROOM)
  async handleJoinSearchingRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data?: { conversationId?: string; voiceName?: string }
  ): Promise<void> {
    const userId = client.data?.userId

    if (!userId) {
      this.logger.warn(
        `[KaiwaGateway] Client ${client.id} missing userId in socket.data; unauthorized`
      )
      client.emit(KAIWA_EVENTS.ERROR, { message: ErrorMessage.MISSING_USER_ID })
      return
    }

    // Kiểm tra xem user có feature AI_KAIWA không
    const hasKaiwaFeature =
      await this.sharedUserSubscriptionService.getHasByfeatureKeyAndUserId(
        FeatureKey.AI_KAIWA,
        userId
      )

    // Nếu user không có feature AI_KAIWA, emit error và disconnect
    if (!hasKaiwaFeature) {
      this.logger.warn(
        `[KaiwaGateway] User ${userId} attempted to join Kaiwa room without AI_KAIWA feature`
      )
      client.emit(KAIWA_EVENTS.ERROR, { message: ErrorMessage.AI_KAIWA_FEATURE_REQUIRED })
      client.disconnect(true)
      return
    }

    // Lấy language từ header và lưu vào client.data
    const language = this.getLanguageFromSocket(client)
    client.data.language = language
    this.logger.log(`[Kaiwa] User ${userId} language detected: ${language}`)

    // Preload user levelJLPT để cache sớm (async, không block)
    this.getUserLevelJLPT(client, userId).catch((err) => {
      this.logger.warn(`[Kaiwa] Failed to preload user levelJLPT: ${err.message}`)
    })

    // Nếu FE gửi conversationId cũ, thử load lịch sử
    const incomingConvId = data?.conversationId?.trim()

    // Đảm bảo conversationId luôn được set trước khi tiếp tục
    if (incomingConvId) {
      // Set conversationId ngay lập tức (dùng incomingConvId)
      client.data.conversationId = incomingConvId
      client.data.conversationHistory = [] // Tạm thời để trống, sẽ load sau

      // Load lịch sử và generate title nếu cần (async, không block)
      this.loadConversationHistoryAndGenerateTitle(
        incomingConvId,
        userId,
        client,
        language
      )
    } else {
      // Không gửi conversationId → tạo cuộc hội thoại mới (force tạo mới, không dùng conversationId cũ)
      client.data.conversationId = `conv_${userId}_${Date.now()}`
      client.data.conversationHistory = []
      this.logger.log(
        `[Kaiwa] User ${userId} creating new conversation: ${client.data.conversationId}`
      )
    }

    // Đảm bảo conversationId đã được set
    if (!client.data.conversationId) {
      this.logger.error(
        `[Kaiwa] conversationId is still undefined for user ${userId}, creating new one`
      )
      client.data.conversationId = `conv_${userId}_${Date.now()}`
      client.data.conversationHistory = []
    }

    // Lưu voiceName vào client.data nếu có
    if (data?.voiceName) {
      client.data.voiceName = data.voiceName
      this.logger.log(`[Kaiwa] User ${userId} set voiceName: ${data.voiceName}`)
    }

    const roomName = this.getRoomName(userId)
    client.join(roomName)

    const conversationId = client.data.conversationId
    this.logger.log(
      `[Kaiwa] User ${userId} joined room ${roomName}, conversationId: ${conversationId}`
    )

    // Tạo hoặc cập nhật AIConversationRoom (async, không block)
    this.aiConversationRoomService
      .create({
        userId,
        conversationId,
        title: null, // Có thể tự động tạo title từ message đầu tiên sau
        voiceName: data?.voiceName || 'ja-JP-Wavenet-A'
      })
      .then((result) => {
        this.logger.log(
          `[Kaiwa] Created/updated room for conversationId: ${conversationId}`
        )
        // Emit room-updated event để FE refresh danh sách
        this.server.to(roomName).emit(KAIWA_EVENTS.ROOM_UPDATED, {
          room: result.data,
          conversationId
        })
      })
      .catch((err) => {
        this.logger.warn(`[Kaiwa] Failed to create/update room: ${err.message}`)
      })

    // Emit joined event
    client.emit(KAIWA_EVENTS.JOINED, {
      conversationId: conversationId,
      roomName,
      userId
    })
  }

  /**
   * Leave kaiwa room: rời phòng, dọn state và gửi ACK
   */
  @SubscribeMessage(KAIWA_EVENTS.LEAVE_KAIWA_ROOM)
  handleLeaveSearchingRoom(@ConnectedSocket() client: Socket): void {
    try {
      const userId = client.data?.userId
      if (!userId) {
        client.emit(KAIWA_EVENTS.ERROR, { message: ErrorMessage.MISSING_USER_ID })
        return
      }

      const roomName = this.getRoomName(userId)
      client.leave(roomName)

      // Cleanup kaiwa-specific state
      if (client.data) {
        client.data.processingAudio = false
        client.data.conversationId = undefined
        client.data.conversationHistory = undefined
        client.data.levelJLPT = undefined // Cleanup cached levelJLPT
      }

      this.logger.log(
        `[Kaiwa] User ${userId} left room ${roomName} and state was cleared`
      )

      // ACK back to client
      client.emit(KAIWA_EVENTS.LEFT, {
        roomName,
        userId,
        timestamp: Date.now()
      })
    } catch (error) {
      this.logger.error(`[Kaiwa] Error handling leave: ${error.message}`)
      client.emit(KAIWA_EVENTS.ERROR, { message: ErrorMessage.LEAVE_ROOM_FAILED })
    }
  }

  /**
   * Handle client disconnect - cleanup conversation state
   */
  handleDisconnect(client: Socket) {
    try {
      const userId = client.data?.userId
      this.logger.log(
        `[Kaiwa] Client ${client.id} disconnected, cleaning up (userId: ${userId || 'unknown'})`
      )
      if (client.data) {
        client.data.processingAudio = false
        client.data.conversationId = undefined
        client.data.conversationHistory = undefined
        client.data.levelJLPT = undefined // Cleanup cached levelJLPT
      }
    } catch (err) {
      this.logger.error(`[Kaiwa] Error during disconnect cleanup: ${err.message}`)
    }
  }
}
