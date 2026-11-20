import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GeminiConfigType } from '@prisma/client'
import { LlmClient } from '@/infrastructure/integrations/ai/llm-client.port'
import { GeminiConfigService } from '@/modules/gemini-config/gemini-config.service'
import {
  getRoomTitlePrompt,
  getRoomTitleLabels,
  getDefaultGenerationConfig
} from '@/common/constants/promt.constant'

// Model used to tell whether the LLM is configured before a room's own model is known
export const DEFAULT_KAIWA_MODEL = 'gemini-2.5-flash'

/**
 * The kaiwa AI calls: Gemini config from the DB (with the lenient fallbacks),
 * the reply to the learner, its Vietnamese translation and the room title.
 * No socket here; KaiwaGateway emits the results (phase 6 X7).
 */
@Injectable()
export class KaiwaAiService {
  private readonly logger = new Logger(KaiwaAiService.name)

  constructor(
    private readonly geminiConfigService: GeminiConfigService,
    private readonly configService: ConfigService,
    private readonly llm: LlmClient
  ) {}

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
  async getGeminiConfigForService(serviceType: GeminiConfigType): Promise<any> {
    try {
      const svcCfg = await this.geminiConfigService.getDefaultConfigForService(
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
  buildGenerationConfig(
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
  buildSafetySettingsOrDefault(dbConfigModel: any): any[] {
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
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE'
      }
    ]
  }

  /**
   * Generate title cho conversation room từ messages bằng AI
   * @param messages - Array of messages (có thể là toàn bộ hoặc messages gần nhất)
   * @param language - Language for title generation
   * @param useLatestMessages - Nếu true, lấy messages cuối cùng (gần nhất), nếu false lấy messages đầu tiên
   */
  async generateRoomTitle(
    messages: Array<{ role: string; text: string }>,
    language: string = 'vi',
    useLatestMessages: boolean = false
  ): Promise<string | null> {
    if (
      !this.llm.isAvailable(DEFAULT_KAIWA_MODEL) ||
      !messages ||
      messages.length === 0
    ) {
      this.logger.warn(
        `[Kaiwa] generateRoomTitle: llm=${this.llm.isAvailable(DEFAULT_KAIWA_MODEL)}, messages.length=${messages?.length || 0}`
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

      this.logger.log(`[Kaiwa] generateRoomTitle: Calling Gemini API...`)
      // One call through the LLM port; the text comes from every part of the
      // first candidate, also when it stopped at MAX_TOKENS
      const result = await this.llm.generate({
        model: modelName,
        contents: finalPrompt,
        generationConfig,
        safetySettings,
        systemInstruction: titleSystemInstruction
      })
      if (result.finishReason === 'MAX_TOKENS') {
        this.logger.warn(
          `[Kaiwa] generateRoomTitle: Hit MAX_TOKENS limit, response may be truncated`
        )
      } else if (result.finishReason && result.finishReason !== 'STOP') {
        this.logger.warn(
          `[Kaiwa] generateRoomTitle: Finish reason is ${result.finishReason}, may be blocked`
        )
      }
      let title: string = result.text.trim()

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
   * The AI reply to the learner's sentence (AI_KAIWA). Empty or "..." answers
   * become a polite "say it again"; a SAFETY stop throws.
   */
  async generateReply({
    kaiwaModelName,
    kaiwaDbConfigModel,
    systemPrompt,
    conversationHistory,
    transcription
  }: {
    kaiwaModelName: string
    kaiwaDbConfigModel: any
    systemPrompt: string
    conversationHistory: any[]
    transcription: string
  }): Promise<string> {
    // Build conversation history cho chat (nếu dùng startChat) hoặc prompt (nếu dùng generateContent)
    const history = conversationHistory.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }))

    // User message hiện tại
    const currentUserMessage = transcription

    if (!this.llm.isAvailable(kaiwaModelName)) {
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

    // One call through the LLM port: the system instruction and the
    // history go together (the old startChat-then-generateContent fallback
    // was only needed by @google/generative-ai)
    const instruction = kaiwaSystemInstruction || systemPrompt
    let fullPrompt = systemPrompt + '\n\n'
    conversationHistory.forEach((msg: any) => {
      if (msg.role === 'user') {
        fullPrompt += `Người học: ${msg.text}\n`
      } else if (msg.role === 'model') {
        fullPrompt += `Bạn: ${msg.text}\n`
      }
    })
    fullPrompt += `Người học: ${transcription}\nBạn:`
    const result = instruction
      ? await this.llm.generate({
          model: kaiwaModelName,
          contents: [
            ...(history as Array<{
              role: 'user' | 'model'
              parts: { text: string }[]
            }>),
            { role: 'user', parts: [{ text: currentUserMessage }] }
          ],
          systemInstruction: instruction,
          generationConfig,
          safetySettings
        })
      : await this.llm.generate({
          model: kaiwaModelName,
          contents: fullPrompt,
          generationConfig,
          safetySettings
        })

    if (result.finishReason === 'SAFETY') {
      this.logger.warn(
        `[Kaiwa] Gemini response blocked by safety filter. Finish reason: ${result.finishReason}`
      )
      throw new Error('Response blocked by safety filter')
    }
    if (result.finishReason === 'MAX_TOKENS') {
      this.logger.warn(`[Kaiwa] Gemini response truncated due to MAX_TOKENS`)
    }
    const text: string = result.text

    this.logger.debug(`[Kaiwa] Gemini raw response: "${text}"`)
    this.logger.debug(`[Kaiwa] Gemini response length: ${text?.length || 0}`)
    this.logger.debug(`[Kaiwa] Gemini finish reason: ${result.finishReason}`)

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
  }

  /**
   * The Vietnamese translation of an AI reply (AI_KAIWA_TRANSLATION)
   */
  async translateReply(geminiResponse: string, requestId: string): Promise<string> {
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
    const safetySettings = this.buildSafetySettingsOrDefault(translationDbConfigModel)

    const translation = (
      await this.llm.generate({
        model: translationModelName,
        contents: translatePrompt,
        generationConfig,
        safetySettings,
        systemInstruction: translationSystemInstruction
      })
    ).text.trim()

    this.logger.log(
      `[Kaiwa] [${requestId}] Vietnamese translation: "${translation.substring(0, 100)}..." (model: ${translationModelName})`
    )
    return translation
  }
}
