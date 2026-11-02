import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleGenAI } from '@google/genai'
import { PrismaService } from '@/shared/services/prisma.service'
import { GeminiConfigRepo } from '@/modules/gemini-config/gemini-config.repo'
import { DataAccessService } from '@/shared/services/data-access.service'
import { PersonalizedRecommendationsResponse } from './dto/gemini.response.dto'
import { RecommendationTargetType } from '@prisma/client'

@Injectable()
export class VertexAIService {
  private readonly logger = new Logger(VertexAIService.name)
  private vertexAI: GoogleGenAI | null = null
  private readonly geminiConfig: any
  private readonly projectId: string
  private readonly location: string
  // In-memory short TTL cache for recommendations
  private readonly shortCache = new Map<
    string,
    { value: PersonalizedRecommendationsResponse; expireAt: number }
  >()

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly geminiConfigRepo: GeminiConfigRepo,
    private readonly dataAccessService: DataAccessService
  ) {
    this.geminiConfig = this.configService.get('gemini')

    // CHỈ dùng Service Account với Vertex AI
    const { clientEmail, privateKey, projectId, location } =
      this.geminiConfig?.serviceAccount || {}

    if (!clientEmail || !privateKey || !projectId) {
      throw new Error(
        'Service Account credentials are required for Vertex AI. Please set GOOGLE_CLOUD_CLIENT_EMAIL, GOOGLE_CLOUD_PRIVATE_KEY, and GOOGLE_CLOUD_PROJECT_ID in .env file.'
      )
    }

    this.projectId = projectId
    this.location = location || 'us-central1'

    try {
      // Khởi tạo Vertex AI client với service account credentials
      this.vertexAI = new GoogleGenAI({
        vertexai: true, // Enable Vertex AI mode
        project: projectId,
        location: this.location,
        googleAuthOptions: {
          credentials: {
            client_email: clientEmail,
            private_key: privateKey.replace(/\\n/g, '\n'),
            project_id: projectId
          }
        }
      })

      this.logger.log(
        `Vertex AI initialized with Google Cloud service account (project: ${projectId}, location: ${this.location})`
      )
    } catch (error) {
      throw new Error(
        `Failed to initialize Vertex AI service account: ${error instanceof Error ? error.message : String(error)}. Please check GOOGLE_CLOUD_* credentials in .env file.`
      )
    }
  }

  /**
   * Lấy config cho Vertex AI generateContent
   * @param modelName - Tên model Gemini (ví dụ: gemini-2.5-pro, gemini-2.5-flash)
   * @param dbConfigModel - GeminiConfigModel từ DB (optional, để lấy maxTokens, preset, etc.)
   */
  private getVertexAIConfig(modelName: string, dbConfigModel?: any) {
    if (!this.vertexAI) {
      throw new Error(
        'Vertex AI chưa được khởi tạo. Vui lòng kiểm tra GOOGLE_CLOUD_* credentials trong .env'
      )
    }

    // Base config từ env
    const generationConfig: any = {
      ...(this.geminiConfig?.generationConfig || {})
    }

    // Override với config từ DB nếu có
    if (dbConfigModel) {
      // Lấy maxTokens từ DB (tên field là maxTokens, nhưng Vertex AI dùng maxOutputTokens)
      if (dbConfigModel.maxTokens) {
        generationConfig.maxOutputTokens = dbConfigModel.maxTokens
      }

      // Lấy preset config nếu có
      if (dbConfigModel.preset) {
        const preset = dbConfigModel.preset
        if (preset.config) {
          if (preset.config.temperature !== undefined) {
            generationConfig.temperature = preset.config.temperature
          }
          if (preset.config.topP !== undefined) {
            generationConfig.topP = preset.config.topP
          }
          if (preset.config.topK !== undefined) {
            generationConfig.topK = preset.config.topK
          }
        }
      }

      // Lấy safetySettings từ DB nếu có
      if (dbConfigModel.safetySettings) {
        // Convert từ DB format (object) sang Vertex AI format (array)
        const converted = this.convertSafetySettingsToVertexAIFormat(
          dbConfigModel.safetySettings
        )
        if (converted && converted.length > 0) {
          generationConfig.safetySettings = converted
        }
      } else if (
        this.geminiConfig?.safetySettings &&
        this.geminiConfig.safetySettings.length > 0
      ) {
        generationConfig.safetySettings = this.geminiConfig.safetySettings
      }
    } else {
      // Fallback: dùng safetySettings từ env
      if (
        this.geminiConfig?.safetySettings &&
        this.geminiConfig.safetySettings.length > 0
      ) {
        generationConfig.safetySettings = this.geminiConfig.safetySettings
      }
    }

    return {
      model: modelName,
      config: generationConfig
    }
  }

  /**
   * Helper method để gọi generateContent với Vertex AI
   * @param modelName - Tên model
   * @param contents - Nội dung prompt
   * @param systemInstruction - System instruction (optional)
   * @param dbConfigModel - GeminiConfigModel từ DB (optional, để lấy maxTokens, etc.)
   */
  private async generateContentWithVertexAI(
    modelName: string,
    contents: string,
    systemInstruction?: string,
    dbConfigModel?: any
  ) {
    if (!this.vertexAI) {
      throw new Error(
        'Vertex AI chưa được khởi tạo. Vui lòng kiểm tra GOOGLE_CLOUD_* credentials trong .env'
      )
    }

    const config = this.getVertexAIConfig(modelName, dbConfigModel)
    const params: any = {
      model: config.model,
      contents: contents,
      config: config.config
    }

    if (systemInstruction) {
      params.systemInstruction = systemInstruction
    }

    this.logger.log(
      `Calling Vertex AI generateContent with model: ${modelName}, contents length: ${contents.length}, maxOutputTokens: ${config.config.maxOutputTokens || 'default'}`
    )
    const response = await this.vertexAI.models.generateContent(params)
    this.logger.debug(
      `Vertex AI response type: ${typeof response}, keys: ${response ? Object.keys(response).join(', ') : 'null'}`
    )
    return response
  }

  /**
   * Lấy gợi ý cá nhân hóa dựa trên dữ liệu userExercises và userTest
   * Sử dụng Vertex AI với Service Account
   */
  async getPersonalizedRecommendations(
    userId: number,
    limit: number = 10,
    options?: { createSrs?: boolean; allowedTypes?: string[] }
  ): Promise<PersonalizedRecommendationsResponse> {
    try {
      this.logger.log(
        `Getting personalized recommendations for user ${userId} (using Vertex AI)`
      )

      // Cache key (policy-independent best-effort). If policy changes often, TTL is short.
      const cacheKey = `rec:${userId}:${limit}`
      const cached = this.shortCache.get(cacheKey)
      const now = Date.now()

      if (cached && cached.expireAt > now) {
        this.logger.log(`Returning cached recommendations for user ${userId}`)
        return cached.value
      }

      // Lấy config default theo mapping service ↔ config
      const svcCfg = await this.geminiConfigRepo.getDefaultConfigForService(
        'PERSONALIZED_RECOMMENDATIONS' as any
      )
      const config: any = svcCfg?.geminiConfig || null

      // Lấy policy từ config
      const policy = config?.geminiConfigModel?.extraParams?.policy || null

      let analysis: any = {}

      if (policy) {
        // Dùng DataAccessService để lấy data theo policy
        this.logger.log(`Using policy for data access: ${JSON.stringify(policy.purpose)}`)
        const safeData = await this.dataAccessService.getAiSafeData(userId, policy)
        this.logger.log(
          `Safe data keys: ${Object.keys(safeData).join(', ')}, counts: ${Object.entries(
            safeData
          )
            .map(([k, v]) => `${k}:${Array.isArray(v) ? v.length : 0}`)
            .join(', ')}`
        )
        analysis = this.buildSummaryFromSafeData(safeData, limit)
        this.logger.log(
          `Analysis built: recentIncorrect=${analysis.recentIncorrect?.length || 0}, vocabularies=${analysis.vocabularies?.length || 0}`
        )
      } else {
        // Fallback: dùng legacy queries nếu không có policy
        const [exerciseAttempts, testAttempts] = await Promise.all([
          this.prisma.userExerciseAttempt.findMany({
            where: { userId },
            include: {
              exercise: { include: { lesson: true } },
              userAnswerLogs: { include: { questionBank: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 50
          }),
          this.prisma.userTestAttempt.findMany({
            where: { userId },
            include: {
              test: true,
              userTestAnswerLogs: { include: { questionBank: true } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 50
          })
        ])
        analysis = this.analyzeUserPerformance(exerciseAttempts, testAttempts)
      }

      // Log analysis để debug
      const analysisStr = JSON.stringify(analysis)
      this.logger.log(
        `Analysis data length: ${analysisStr.length}, keys: ${Object.keys(analysis).join(', ')}`
      )

      if (
        !analysis ||
        Object.keys(analysis).length === 0 ||
        (!analysis.recentIncorrect?.length &&
          !analysis.vocabularies?.length &&
          !analysis.failedTests?.length &&
          !analysis.failedExercises?.length)
      ) {
        this.logger.warn(
          'Analysis data is empty or has no meaningful data. This may result in empty recommendations.'
        )
      }

      const prompt = config
        ? this.replacePlaceholders(String(config.prompt || ''), {
            analysis: analysisStr,
            limit: limit.toString()
          })
        : this.buildRecommendationPrompt(analysis, limit)

      this.logger.log(
        `Prompt length: ${prompt.length}, preview: ${prompt.substring(0, 300)}`
      )

      // Chỉ dùng model từ config, không cho override từ request
      const modelName =
        (config?.geminiConfigModel?.geminiModel?.key as string) || 'gemini-2.5-pro'
      this.logger.log(`Using model: ${modelName}`)

      // Gọi Vertex AI với Service Account, truyền config model để lấy maxTokens
      const result = await this.generateContentWithVertexAI(
        modelName,
        prompt,
        undefined, // systemInstruction đã có trong prompt hoặc config
        config?.geminiConfigModel // Truyền DB config để lấy maxTokens
      )

      // Log response structure để debug
      this.logger.log(`Vertex AI response type: ${typeof result}`)
      if (result && typeof result === 'object') {
        this.logger.log(`Vertex AI response keys: ${Object.keys(result).join(', ')}`)
      }

      // @google/genai GenerateContentResponse có getter text property (không phải method)
      // Xem: node_modules/@google/genai/dist/node/node.d.ts line 2746
      let text = ''

      if (result && typeof result === 'object') {
        // Cách 1: Dùng getter text (GenerateContentResponse có getter text)
        if ('text' in result) {
          const textValue = (result as any).text
          if (typeof textValue === 'string') {
            text = textValue
            this.logger.log('Got text from result.text getter')
          } else if (textValue !== undefined && textValue !== null) {
            // Nếu text là getter trả về undefined, thử lấy từ candidates
            this.logger.warn('result.text is not a string, trying candidates')
          }
        }

        // Cách 2: Nếu text getter không có hoặc undefined, thử lấy từ candidates
        if (
          !text &&
          'candidates' in result &&
          Array.isArray(result.candidates) &&
          result.candidates.length > 0
        ) {
          const candidate = result.candidates[0]
          if (candidate && typeof candidate === 'object' && 'content' in candidate) {
            const content = (candidate as any).content
            if (
              content &&
              'parts' in content &&
              Array.isArray(content.parts) &&
              content.parts.length > 0
            ) {
              // Lấy tất cả text parts và join lại
              const textParts = content.parts
                .filter((p: any) => p && 'text' in p && typeof p.text === 'string')
                .map((p: any) => p.text)

              if (textParts.length > 0) {
                text = textParts.join('')
                this.logger.log(
                  `Got text from ${textParts.length} text parts in candidates[0]`
                )
              }
            }
          }
        }
      } else if (typeof result === 'string') {
        text = result
        this.logger.log('Result is a string')
      }

      this.logger.log(
        `Vertex AI response text length: ${text.length}, preview: ${text.substring(0, 200)}`
      )

      if (!text || text.trim() === '') {
        this.logger.error(
          `Empty response from Vertex AI. Full response structure: ${JSON.stringify(result, null, 2).substring(0, 1000)}`
        )
        throw new Error('Empty text in Vertex AI response')
      }

      // Parse response từ Gemini
      let recommendations = this.parseRecommendationsResponse(text, analysis)
      this.logger.log(`Parsed ${recommendations.length} recommendations`)
      if (options?.allowedTypes && options.allowedTypes.length > 0) {
        const allow = new Set(options.allowedTypes.map((t) => String(t).toUpperCase()))
        recommendations = recommendations.filter((r: any) =>
          allow.has(String(r.contentType || '').toUpperCase())
        )
      }

      const payload: PersonalizedRecommendationsResponse = {
        recommendations: recommendations.slice(0, limit),
        summary: analysis
      }

      this.logger.log(
        `Final recommendations count: ${payload.recommendations.length}, createSrs: ${options?.createSrs}, allowedTypes: ${options?.allowedTypes?.join(',')}`
      )

      // Tạo SRS reviews từ recommendations nếu được yêu cầu
      if (options?.createSrs && recommendations.length > 0) {
        this.logger.log(
          `Creating SRS entries for ${recommendations.length} recommendations`
        )
        try {
          const srsRows = recommendations
            .filter((r: any) => {
              const contentType = String(r.contentType || '').toUpperCase()
              // Chỉ tạo SRS cho các type hợp lệ
              const isValidType = [
                'VOCABULARY',
                'GRAMMAR',
                'KANJI',
                'TEST',
                'EXERCISE'
              ].includes(contentType)
              const hasValidId = r.contentId > 0
              if (!isValidType || !hasValidId) {
                this.logger.debug(
                  `Skipping recommendation: contentType=${contentType}, contentId=${r.contentId}`
                )
              }
              return isValidType && hasValidId
            })
            .map((r: any) => {
              const contentType = String(r.contentType || '').toUpperCase()
              return {
                userId,
                contentType: contentType as any,
                contentId: Number(r.contentId),
                nextReviewDate: new Date(),
                srsLevel: 0,
                incorrectStreak: 0,
                isLeech: false,
                message: String(r.message || r.reason || '')
              }
            })

          this.logger.log(
            `Filtered ${srsRows.length} valid SRS rows from ${recommendations.length} recommendations`
          )

          if (srsRows.length === 0) {
            this.logger.warn(
              `No valid SRS rows after filtering. Recommendations: ${recommendations.map((r: any) => `${r.contentType}:${r.contentId}`).join(', ')}`
            )
          } else {
            // Loại bỏ các entry đã tồn tại
            const existingSrs = await this.prisma.userSrsReview.findMany({
              where: {
                userId,
                contentId: { in: srsRows.map((s: any) => s.contentId) },
                contentType: { in: srsRows.map((s: any) => s.contentType) as any[] }
              },
              select: { contentId: true, contentType: true }
            })

            const existingSet = new Set(
              existingSrs.map((e: any) => `${e.contentId}-${e.contentType}`)
            )

            const newSrsRows = srsRows.filter(
              (s: any) => !existingSet.has(`${s.contentId}-${s.contentType}`)
            )

            this.logger.log(
              `SRS rows: total=${srsRows.length}, existing=${existingSrs.length}, new=${newSrsRows.length}`
            )

            if (newSrsRows.length > 0) {
              await this.prisma.userSrsReview.createMany({
                data: newSrsRows,
                skipDuplicates: true
              })
              this.logger.log(
                `Created ${newSrsRows.length} SRS entries for user ${userId}`
              )
            } else {
              this.logger.warn(
                `No new SRS entries to create. Total: ${srsRows.length}, Existing: ${existingSrs.length}`
              )
            }
          }
        } catch (e) {
          this.logger.error('Failed to create SRS entries', e as any)
          this.logger.error('Error details:', e)
        }
      } else {
        this.logger.warn(
          `SRS creation skipped: createSrs=${options?.createSrs}, recommendations.length=${recommendations.length}`
        )
      }

      // Lưu recommendations vào DB
      try {
        const recRows = (payload.recommendations || [])
          .map((r: any) => {
            const contentTypeUpper = (r.contentType || 'VOCABULARY').toUpperCase()
            let targetType: RecommendationTargetType = RecommendationTargetType.VOCABULARY

            if (contentTypeUpper === 'VOCABULARY')
              targetType = RecommendationTargetType.VOCABULARY
            else if (contentTypeUpper === 'GRAMMAR')
              targetType = RecommendationTargetType.GRAMMAR
            else if (contentTypeUpper === 'KANJI')
              targetType = RecommendationTargetType.KANJI
            else if (contentTypeUpper === 'EXERCISE')
              targetType = RecommendationTargetType.EXERCISE
            else if (contentTypeUpper === 'TEST')
              targetType = RecommendationTargetType.TEST
            else if (contentTypeUpper === 'LESSON')
              targetType = RecommendationTargetType.LESSON

            return {
              userId,
              targetType,
              targetId: Number(r.contentId) || 0,
              reason: String(r.reason || ''),
              source: 'PERSONALIZED' as any, // Field trong schema là 'source', không phải 'sourceType'
              status: 'PENDING' as any
            }
          })
          .filter((r: any) => r.targetId > 0)

        if (recRows.length > 0) {
          await (this.prisma as any).userAIRecommendation.createMany({
            data: recRows,
            skipDuplicates: true
          })
        }
      } catch (e) {
        this.logger.warn('Failed to persist recommendations', e as any)
      }

      // Cache 120s
      this.shortCache.set(cacheKey, { value: payload, expireAt: now + 120_000 })
      return payload
    } catch (error) {
      this.logger.error('Error getting personalized recommendations:', error)

      // Kiểm tra lỗi Vertex AI API chưa được enable
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        error.status === 403
      ) {
        const errorObj = error as any
        const errorMessage = errorObj.message || errorObj.error?.message || ''

        if (
          errorMessage.includes('SERVICE_DISABLED') ||
          errorMessage.includes('Vertex AI API has not been used') ||
          errorMessage.includes('aiplatform.googleapis.com')
        ) {
          let activationUrl =
            'https://console.developers.google.com/apis/api/aiplatform.googleapis.com/overview'
          let projectId = this.projectId || 'your-project-id'

          if (errorObj.error?.details) {
            const details = Array.isArray(errorObj.error.details)
              ? errorObj.error.details
              : [errorObj.error.details]
            for (const detail of details) {
              if (detail.metadata?.activationUrl) {
                activationUrl = detail.metadata.activationUrl
              }
              if (detail.metadata?.consumer) {
                const match = detail.metadata.consumer.match(/projects\/([^/]+)/)
                if (match) projectId = match[1]
              }
            }
          }

          const errorMsg =
            `Vertex AI API chưa được kích hoạt trong Google Cloud Project "${projectId}". ` +
            `Vui lòng enable API tại: ${activationUrl} ` +
            `Sau khi enable, đợi vài phút để hệ thống cập nhật rồi thử lại.`

          throw new BadRequestException(errorMsg)
        }
      }

      throw new BadRequestException(
        'Không thể lấy gợi ý cá nhân hóa: ' +
          (error instanceof Error ? error.message : String(error))
      )
    }
  }

  // Helper methods (copy từ GeminiService)
  private replacePlaceholders(template: string, vars: Record<string, string>): string {
    let result = template
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }
    return result
  }

  private buildRecommendationPrompt(analysis: any, limit: number): string {
    // Sử dụng prompt từ RECOMMENDATIONS_PROMPT.md
    return `Bạn là cố vấn ôn tập từ vựng/ngữ pháp/Kanji. CHỈ sử dụng dữ liệu trong ${JSON.stringify(analysis)}.
Nhiệm vụ:
1) Từ danh sách câu người dùng trả lời SAI gần đây (recentIncorrect), hãy map chính xác tới content trong hệ thống:
- Nếu questionType = VOCABULARY → contentType = VOCABULARY và contentId = vocabularyId tương ứng
- Nếu questionType = GRAMMAR → contentType = GRAMMAR và contentId = grammarId tương ứng (nếu có)
- Nếu questionType = KANJI → contentType = KANJI và contentId = kanjiId tương ứng (nếu có)
2) Loại bỏ những content đã có SRS hiện hành (có trong srs.existing).
3) Ưu tiên:
- Leech (incorrectStreak cao), sai lặp lại, hoặc cấp độ thấp (levelN lớn số hơn).
- Sai trong 7 ngày gần nhất.
4) Trả về đúng ${limit} mục.
5) CHỈ TRẢ JSON array dạng:
[
  { "contentType": "VOCABULARY"|"GRAMMAR"|"KANJI", "contentId": <number>, "reason": "<ngắn gọn>", "priority": "high"|"medium"|"low", "message": "<lời khuyên cụ thể>" }
]
Không thêm bất kỳ text nào ngoài JSON. Không bịa ID, chỉ dùng ID có trong dữ liệu. Nếu không đủ dữ liệu, trả mảng rỗng.`
  }

  private parseRecommendationsResponse(text: string, analysis: any): any[] {
    try {
      this.logger.debug(
        `Parsing response text (first 500 chars): ${text.substring(0, 500)}`
      )

      // Bước 1: Remove markdown code blocks
      let cleaned = text
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      // Bước 2: Tìm JSON array - extract từ [ đầu tiên
      let jsonStart = cleaned.indexOf('[')
      if (jsonStart === -1) {
        this.logger.warn(
          `Không tìm thấy '[' trong response. Text: ${cleaned.substring(0, 500)}`
        )
        throw new Error('Không tìm thấy JSON array trong response')
      }

      // Extract từ [ đến cuối (có thể bị cắt)
      let extractedJson = cleaned.substring(jsonStart)

      // Tìm ] hợp lệ cuối cùng (không nằm trong string)
      let jsonEnd = -1
      let inString = false
      let escaped = false

      // Tìm từ cuối lên để tìm ] hợp lệ
      for (let i = extractedJson.length - 1; i >= 0; i--) {
        const char = extractedJson[i]
        if (escaped) {
          escaped = false
          continue
        }
        if (char === '\\') {
          escaped = true
          continue
        }
        if (char === '"') {
          inString = !inString
          continue
        }
        if (!inString && char === ']') {
          jsonEnd = i
          break
        }
      }

      if (jsonEnd === -1) {
        // Không tìm thấy ] hợp lệ, JSON bị cắt - sẽ fix sau
        this.logger.warn('JSON bị cắt (không tìm thấy ] hợp lệ). Sẽ thử fix')
        // Giữ toàn bộ từ [ đến cuối, sẽ fix trong parseError
      } else {
        extractedJson = extractedJson.substring(0, jsonEnd + 1)
      }

      this.logger.debug(
        `Extracted JSON length: ${extractedJson.length}, preview: ${extractedJson.substring(0, 300)}...`
      )

      // Bước 3: Parse JSON
      let parsed: any
      try {
        parsed = JSON.parse(extractedJson)
      } catch (parseError: any) {
        // Nếu parse lỗi, thử fix
        if (parseError instanceof SyntaxError) {
          this.logger.warn(
            `JSON parse error: ${parseError.message}. Attempting to fix...`
          )
          const fixedJson = this.fixUnterminatedJson(extractedJson)
          try {
            parsed = JSON.parse(fixedJson)
            this.logger.log('Successfully parsed after fixing JSON')
          } catch (e2: any) {
            this.logger.error(`Failed to parse even after fixing. Error: ${e2.message}`)
            this.logger.error(`Fixed JSON preview: ${fixedJson.substring(0, 500)}`)
            // Nếu vẫn lỗi, thử parse từng item một (partial recovery)
            parsed = this.parsePartialJson(extractedJson)
          }
        } else {
          throw parseError
        }
      }

      if (!Array.isArray(parsed)) {
        this.logger.warn(`Response không phải là array, type: ${typeof parsed}`)
        // Thử parse như object
        if (parsed.items && Array.isArray(parsed.items)) {
          return this.mapRecommendations(parsed.items)
        } else if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
          return this.mapRecommendations(parsed.recommendations)
        }
        throw new Error('Response không phải là array')
      }

      return this.mapRecommendations(parsed)
    } catch (error) {
      this.logger.error('Error parsing recommendations response:', error)
      this.logger.error(
        `Full response text (first 2000 chars): ${text.substring(0, 2000)}`
      )
      return []
    }
  }

  /**
   * Fix unterminated JSON string bằng cách đóng các string và object chưa đóng
   */
  private fixUnterminatedJson(json: string): string {
    let inString = false
    let escaped = false
    let braceDepth = 0
    let bracketDepth = 0

    // Tìm vị trí cuối cùng đang trong string
    for (let i = 0; i < json.length; i++) {
      const char = json[i]

      if (escaped) {
        escaped = false
        continue
      }

      if (char === '\\') {
        escaped = true
        continue
      }

      if (char === '"') {
        inString = !inString
      }

      if (!inString) {
        if (char === '{') braceDepth++
        else if (char === '}') braceDepth--
        else if (char === '[') bracketDepth++
        else if (char === ']') bracketDepth--
      }
    }

    let fixed = json

    // Nếu đang trong string khi kết thúc, đóng string
    if (inString) {
      // Tìm vị trí để chèn " (trước ] hoặc ở cuối)
      const lastBracket = fixed.lastIndexOf(']')
      if (lastBracket !== -1 && lastBracket > fixed.length - 10) {
        // Nếu ] gần cuối, đóng string trước ]
        fixed = fixed.substring(0, lastBracket) + '"' + fixed.substring(lastBracket)
      } else {
        // Đóng string ở cuối
        fixed = fixed + '"'
      }
      this.logger.debug('Fixed unterminated string')
    }

    // Đóng các object/array chưa đóng
    while (braceDepth > 0) {
      fixed += '}'
      braceDepth--
    }
    while (bracketDepth > 0) {
      fixed += ']'
      bracketDepth--
    }

    return fixed
  }

  /**
   * Parse partial JSON - lấy các item hợp lệ từ JSON bị cắt
   */
  private parsePartialJson(json: string): any[] {
    this.logger.warn('Attempting partial JSON parsing')
    const items: any[] = []

    // Tìm các object hoàn chỉnh trong array
    let currentItem = ''
    let braceDepth = 0
    let inString = false
    let escaped = false

    for (let i = 0; i < json.length; i++) {
      const char = json[i]

      if (escaped) {
        escaped = false
        currentItem += char
        continue
      }

      if (char === '\\') {
        escaped = true
        currentItem += char
        continue
      }

      if (char === '"') {
        inString = !inString
        currentItem += char
        continue
      }

      if (!inString) {
        if (char === '{') {
          braceDepth++
          if (braceDepth === 1) {
            currentItem = '' // Reset cho object mới
          }
          currentItem += char
        } else if (char === '}') {
          braceDepth--
          currentItem += char
          if (braceDepth === 0) {
            // Object hoàn chỉnh, thử parse
            try {
              const item = JSON.parse(currentItem)
              items.push(item)
              this.logger.debug(
                `Parsed partial item: ${item.contentType || 'unknown'}:${item.contentId || 0}`
              )
            } catch (e) {
              this.logger.debug(`Failed to parse item: ${currentItem.substring(0, 100)}`)
            }
            currentItem = ''
          }
        } else {
          currentItem += char
        }
      } else {
        currentItem += char
      }
    }

    this.logger.log(`Parsed ${items.length} items from partial JSON`)
    return items
  }

  /**
   * Convert safetySettings từ DB format (object) sang Vertex AI format (array)
   * DB format: { "HARASSMENT": "BLOCK", "HATE_SPEECH": "BLOCK_NONE" }
   * Vertex AI format: [{ category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }]
   */
  private convertSafetySettingsToVertexAIFormat(
    dbSafetySettings: any
  ): any[] | undefined {
    // Nếu đã là array format đúng, return luôn
    if (Array.isArray(dbSafetySettings)) {
      return dbSafetySettings
    }

    // Map từ DB format sang Vertex AI format
    const categoryMap: Record<string, string> = {
      HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
      HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
      SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      CIVIC_INTEGRITY: 'HARM_CATEGORY_CIVIC_INTEGRITY'
    }

    const thresholdMap: Record<string, string> = {
      BLOCK: 'BLOCK_MEDIUM_AND_ABOVE',
      BLOCK_NONE: 'BLOCK_NONE',
      BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
      HARM_BLOCK_THRESHOLD_UNSPECIFIED: 'HARM_BLOCK_THRESHOLD_UNSPECIFIED'
    }

    const result: any[] = []

    // Nếu là object, convert từng key-value
    if (typeof dbSafetySettings === 'object' && dbSafetySettings !== null) {
      for (const [key, value] of Object.entries(dbSafetySettings)) {
        const category =
          categoryMap[key.toUpperCase()] || `HARM_CATEGORY_${key.toUpperCase()}`
        const threshold =
          typeof value === 'string'
            ? thresholdMap[value.toUpperCase()] || value.toUpperCase()
            : 'BLOCK_MEDIUM_AND_ABOVE'

        result.push({
          category,
          threshold
        })
      }
    }

    return result.length > 0 ? result : undefined
  }

  private mapRecommendations(parsed: any[]): any[] {
    return parsed
      .map((item) => ({
        contentType: item.contentType || 'VOCABULARY', // VOCABULARY | GRAMMAR | KANJI
        contentId: Number(item.contentId) || 0,
        reason: item.reason || '',
        message: item.message || item.reason || '',
        priority: item.priority || 'medium'
      }))
      .filter((r: any) => r.contentId > 0) // Chỉ lấy những item có contentId hợp lệ
  }

  private buildSummaryFromSafeData(safeData: Record<string, any[]>, limit: number) {
    // Data đã được limit ở DataAccessService theo policy config, không cần slice nữa
    const answerLogs = safeData['UserAnswerLog'] || []
    const testAnswerLogs = safeData['UserTestAnswerLog'] || []
    const exerciseAttempts = safeData['UserExerciseAttempt'] || []
    const testAttempts = safeData['UserTestAttempt'] || []
    const questionBanks = safeData['QuestionBank'] || []
    const answers = safeData['Answer'] || []
    const vocabularies = safeData['Vocabulary'] || []
    const existingSrs = (safeData['UserSrsReview'] || []).map(
      (s: any) => `${s.contentType}-${s.contentId}`
    )

    // Build maps for quick lookup
    const qbMap = new Map<number, any>()
    for (const qb of questionBanks) {
      if (qb && qb.id != null) qbMap.set(qb.id as number, qb)
    }

    const answerMap = new Map<number, any>()
    for (const ans of answers) {
      if (ans && ans.id != null) answerMap.set(ans.id as number, ans)
    }

    // Build exercise/test attempt maps for quick lookup
    const exerciseAttemptMap = new Map<number, number>() // attemptId -> exerciseId
    for (const attempt of exerciseAttempts) {
      if (attempt.id && attempt.exerciseId) {
        exerciseAttemptMap.set(attempt.id, attempt.exerciseId)
      }
    }

    const testAttemptMap = new Map<number, number>() // attemptId -> testId
    for (const attempt of testAttempts) {
      if (attempt.id && attempt.testId) {
        testAttemptMap.set(attempt.id, attempt.testId)
      }
    }

    // Collect incorrect answers (recent, within 7 days)
    const recentIncorrect: any[] = []
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    for (const log of answerLogs) {
      if (!log.isCorrect && log.questionBankId) {
        const qb = qbMap.get(log.questionBankId)
        if (qb && log.createdAt && new Date(log.createdAt) >= sevenDaysAgo) {
          const ans = log.answerId ? answerMap.get(log.answerId) : null
          const exerciseId = log.userExerciseAttemptId
            ? exerciseAttemptMap.get(log.userExerciseAttemptId)
            : null
          recentIncorrect.push({
            questionBankId: log.questionBankId,
            questionType: qb.questionType,
            questionJp: qb.questionJp || '',
            levelN: qb.levelN,
            createdAt: log.createdAt,
            answerJp: ans?.answerJp || '',
            exerciseId
          })
        }
      }
    }

    for (const log of testAnswerLogs) {
      if (!log.isCorrect && log.questionBankId) {
        const qb = qbMap.get(log.questionBankId)
        if (qb && log.createdAt && new Date(log.createdAt) >= sevenDaysAgo) {
          const ans = log.answerId ? answerMap.get(log.answerId) : null
          const testId = log.userTestAttemptId
            ? testAttemptMap.get(log.userTestAttemptId)
            : null
          recentIncorrect.push({
            questionBankId: log.questionBankId,
            questionType: qb.questionType,
            questionJp: qb.questionJp || '',
            levelN: qb.levelN,
            createdAt: log.createdAt,
            answerJp: ans?.answerJp || '',
            testId
          })
        }
      }
    }

    // Sort by most recent
    recentIncorrect.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Group failed tests/exercises
    const failedTests = new Map<
      number,
      { testId: number; score?: number; updatedAt: any; questionTypes: Set<string> }
    >()
    const failedExercises = new Map<
      number,
      { exerciseId: number; updatedAt: any; questionTypes: Set<string> }
    >()

    for (const attempt of testAttempts) {
      if (attempt.score !== null && (attempt.score < 60 || attempt.status === 'FAILED')) {
        const existing = failedTests.get(attempt.testId) || {
          testId: attempt.testId,
          score: attempt.score,
          updatedAt: attempt.updatedAt,
          questionTypes: new Set<string>()
        }
        for (const tal of testAnswerLogs) {
          if (tal.userTestAttemptId === attempt.id && !tal.isCorrect) {
            const qb = qbMap.get(tal.questionBankId)
            if (qb) existing.questionTypes.add(qb.questionType)
          }
        }
        failedTests.set(attempt.testId, existing)
      }
    }

    for (const attempt of exerciseAttempts) {
      if (attempt.status === 'FAILED' || attempt.status === 'ABANDONED') {
        const existing = failedExercises.get(attempt.exerciseId) || {
          exerciseId: attempt.exerciseId,
          updatedAt: attempt.updatedAt,
          questionTypes: new Set<string>()
        }
        for (const al of answerLogs) {
          if (al.userExerciseAttemptId === attempt.id && !al.isCorrect) {
            const qb = qbMap.get(al.questionBankId)
            if (qb) existing.questionTypes.add(qb.questionType)
          }
        }
        failedExercises.set(attempt.exerciseId, existing)
      }
    }

    return {
      recentIncorrect: recentIncorrect.slice(0, 100),
      vocabularies: vocabularies.slice(0, 500).map((v: any) => ({
        id: v.id,
        wordJp: v.wordJp,
        reading: v.reading,
        levelN: v.levelN
      })),
      failedTests: Array.from(failedTests.values()).map((t: any) => ({
        testId: t.testId,
        score: t.score,
        updatedAt: t.updatedAt,
        questionTypes: Array.from(t.questionTypes)
      })),
      failedExercises: Array.from(failedExercises.values()).map((e: any) => ({
        exerciseId: e.exerciseId,
        updatedAt: e.updatedAt,
        questionTypes: Array.from(e.questionTypes)
      })),
      srs: {
        existing: existingSrs
      }
    }
  }

  private analyzeUserPerformance(exerciseAttempts: any[], testAttempts: any[]): any {
    // Simplified fallback - chỉ dùng khi không có policy
    return {
      recentIncorrect: [],
      vocabularies: [],
      grammars: [],
      kanjis: [],
      failedTests: [],
      failedExercises: [],
      srs: { existing: [] }
    }
  }
}
