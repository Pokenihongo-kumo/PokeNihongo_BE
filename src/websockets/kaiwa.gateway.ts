import { BullQueue } from '@/common/constants/bull-action.constant'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
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
import { LlmClient } from '@/infrastructure/integrations/ai/llm-client.port'
import { SpeechToTextService } from '@/modules/speech/speech-to-text.service'
import { TextToSpeechService } from '@/modules/speech/text-to-speech.service'
import { KAIWA_EVENTS } from '@/common/constants/socket.constant'
import { Error as ErrorMessage } from '@/common/constants/message'
import { FeatureKey } from '@/common/constants/subscription.constant'
import { UserAIConversationService } from '@/modules/user-ai-conversation/user-ai-conversation.service'
import { AIConversationRoomService } from '@/modules/ai-conversation-room/ai-conversation-room.service'
import { I18nService } from '@/i18n/i18n.service'
import { GeminiConfigType } from '@prisma/client'
import {
  buildSystemPromptWithLevel,
  DEFAULT_KAIWA_SYSTEM_PROMPT
} from '@/common/constants/promt.constant'
import { UserCoreService } from '@/modules/user/user-core.service'
import { UserSubscriptionService } from '@/modules/user-subscription/user-subscription.service'
import { DEFAULT_KAIWA_MODEL, KaiwaAiService } from './kaiwa/kaiwa-ai.service'
import { KaiwaAudioService } from './kaiwa/kaiwa-audio.service'

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

  constructor(
    @InjectQueue(BullQueue.KAIWA_PROCESSOR) private readonly kaiwaQueue: Queue,
    private readonly speechToTextService: SpeechToTextService,
    private readonly textToSpeechService: TextToSpeechService,
    private readonly userAIConversationService: UserAIConversationService,
    private readonly aiConversationRoomService: AIConversationRoomService,
    private readonly i18nService: I18nService,
    private readonly userCoreService: UserCoreService,
    private readonly sharedUserSubscriptionService: UserSubscriptionService,
    private readonly llm: LlmClient,
    private readonly kaiwaAi: KaiwaAiService,
    private readonly kaiwaAudio: KaiwaAudioService
  ) {}

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
      const user = await this.userCoreService.findUnique({ id: userId })
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
        finalAudioBuffer = await this.kaiwaAudio.convertMp4ToFlac(audioBuffer, requestId)
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
    if (!this.kaiwaAudio.isValidJapaneseText(transcription)) {
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
      const { finalBuffer, mimeType, extension } = this.kaiwaAudio.prepareAudioForUpload(
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
      const audioUrl = await this.kaiwaAudio.uploadAudioBuffer(
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
        room: result,
        conversationId
      })
      if (requestId) {
        this.logger.log(
          `[Kaiwa] [${requestId}] Room updated successfully, title: "${result?.title || 'null'}"`
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
      if (!this.llm.isAvailable(DEFAULT_KAIWA_MODEL)) {
        client.emit(KAIWA_EVENTS.ERROR, {
          message: ErrorMessage.GEMINI_API_NOT_INITIALIZED,
          suggestion: ErrorMessage.GEMINI_API_KEY_NOT_SET
        })
        return
      }
      //#endregion

      // Parse audio payload và detect format
      const { audioBuffer, audioFormat, mimeType } = this.kaiwaAudio.parseAudioPayload(
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
      const conversationHistory = client.data.conversationHistory || []

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
          const userMessageId = result?.id || null
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
      const kaiwaConfig = await this.kaiwaAi.getGeminiConfigForService(
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
      const geminiPromise = this.kaiwaAi.generateReply({
        kaiwaModelName,
        kaiwaDbConfigModel,
        systemPrompt,
        conversationHistory,
        transcription
      })

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
      // The AI audio upload awaits this id: TTS can finish before the insert does
      const aiMessageSaved: Promise<number | null> = this.userAIConversationService
        .create({
          userId,
          conversationId: client.data.conversationId,
          role: 'AI',
          message: geminiResponse,
          audioUrl: null // Sẽ update sau khi có TTS audio
        })
        .then((result) => {
          const aiMessageId = result?.id || null
          this.logger.log(
            `[Kaiwa] [${requestId}] Saved AI message (ID: ${aiMessageId}), waiting for TTS audio...`
          )
          return aiMessageId
        })
        .catch((err) => {
          this.logger.warn(
            `[Kaiwa] [${requestId}] Failed to save AI message: ${err.message}`
          )
          return null
        })

      // Update room với lastMessage từ AI (async, không block)
      // Cũng check và generate title nếu chưa có (có thể đã generate ở USER message, nhưng check lại để chắc chắn)
      // conversationHistory đã được update với cả user và AI message ở trên
      this.aiConversationRoomService
        .findByConversationId(client.data.conversationId, userId)
        .then(async (roomResult) => {
          let room = roomResult

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
              room = createResult
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
              const generatedTitle = await this.kaiwaAi.generateRoomTitle(
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
      if (this.llm.isAvailable(DEFAULT_KAIWA_MODEL)) {
        // Translation - emit ngay khi có
        ;(async () => {
          try {
            const translation = await this.kaiwaAi.translateReply(
              geminiResponse,
              requestId
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
              if (roomResult?.voiceName) {
                voiceName = roomResult.voiceName
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
                await aiMessageSaved,
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
        const messages = (res || []) as Array<any>
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
              const room = roomResult
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
                const generatedTitle = await this.kaiwaAi.generateRoomTitle(
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
          room: result,
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
