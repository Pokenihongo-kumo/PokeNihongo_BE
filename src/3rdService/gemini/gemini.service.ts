import {
  Injectable,
  Logger,
  BadRequestException,
  BadGatewayException,
  Inject
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { PrismaService } from '@/shared/services/prisma.service'
// import { GeminiConfigType } from '@prisma/client' // Will be available after migration
import { GeminiConfigRepo } from '@/modules/gemini-config/gemini-config.repo'
import { TextToSpeechService } from '../speech/text-to-speech.service'
import { SpeechToTextService } from '../speech/speech-to-text.service'
import { UploadService } from '../upload/upload.service'
import { SpeakingService } from '@/modules/speaking/speaking.service'
import { DataAccessService } from '@/shared/services/data-access.service'
import {
  EvaluateSpeakingDto,
  AIKaiwaDto,
  ChatWithGeminiDto,
  TestNativeAudioDialogDto
} from './dto/gemini.dto'
import {
  SpeakingEvaluationResponse,
  PersonalizedRecommendationsResponse,
  AIKaiwaResponse,
  ChatWithGeminiResponse,
  TestNativeAudioDialogResponse
} from './dto/gemini.response.dto'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import { GEMINI_DEFAULT_CONFIGS } from './config/gemini-default-configs'
import {
  PRONUNCIATION_MODELS,
  PRONUNCIATION_SYSTEM_INSTRUCTION
} from './dto/pronunciation-assessment.dto'
import { GeminiConfigType, RecommendationTargetType } from '@prisma/client'
import * as crypto from 'crypto'
import { Redis } from 'ioredis'

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name)
  private genAI: GoogleGenerativeAI | null = null // Cho Pro models
  private genAIFlash: GoogleGenerativeAI | null = null // Cho Flash models
  private readonly geminiConfig: any
  private readonly CACHE_PREFIX = 'rec:' // Prefix cho Redis keys

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly geminiConfigRepo: GeminiConfigRepo,
    private readonly textToSpeechService: TextToSpeechService,
    private readonly speechToTextService: SpeechToTextService,
    private readonly uploadService: UploadService,
    private readonly speakingService: SpeakingService,
    private readonly dataAccessService: DataAccessService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis
  ) {
    this.geminiConfig = this.configService.get('gemini')
    this.logger.log('Gemini AI will use API keys (lazy initialization per model)')
  }

  //#region Helper methods
  /**
   * Lấy ngày hôm nay dạng string (YYYY-MM-DD) theo timezone HCM (UTC+7)
   */
  private getHcmTodayString(): string {
    const now = new Date()
    // Lấy UTC time và cộng thêm 7 giờ để có HCM time
    const hcmTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
    // Lấy ngày theo HCM timezone
    return hcmTime.toISOString().split('T')[0]
  }

  /**
   * Lấy start và end của ngày hôm nay theo timezone HCM (UTC+7)
   * Trả về Date objects ở UTC để lưu vào DB
   * @returns { start: Date; end: Date } - UTC dates
   */
  private getHcmTodayRange(): { start: Date; end: Date } {
    const now = new Date()
    // Lấy HCM time (UTC+7)
    const hcmTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)

    // Lấy ngày hôm nay theo HCM
    const hcmYear = hcmTime.getUTCFullYear()
    const hcmMonth = hcmTime.getUTCMonth()
    const hcmDate = hcmTime.getUTCDate()

    // Tạo start của ngày hôm nay (00:00:00 HCM) -> convert về UTC
    const start = new Date(Date.UTC(hcmYear, hcmMonth, hcmDate, 0, 0, 0, 0))
    start.setTime(start.getTime() - 7 * 60 * 60 * 1000)

    // Tạo end của ngày hôm nay (23:59:59.999 HCM) -> convert về UTC
    const end = new Date(Date.UTC(hcmYear, hcmMonth, hcmDate, 23, 59, 59, 999))
    end.setTime(end.getTime() - 7 * 60 * 60 * 1000)

    return { start, end }
  }

  private getUtcTodayStart(): Date {
    const now = new Date()
    const hcmTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
    return new Date(
      Date.UTC(
        hcmTime.getUTCFullYear(),
        hcmTime.getUTCMonth(),
        hcmTime.getUTCDate(),
        0,
        0,
        0,
        0
      )
    )
  }

  private getUtcTomorrowStart(): Date {
    const now = new Date()
    const hcmTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)

    // Lấy ngày mai theo HCM
    const tomorrowHcm = new Date(hcmTime)
    tomorrowHcm.setUTCDate(tomorrowHcm.getUTCDate() + 1)

    return new Date(
      Date.UTC(
        tomorrowHcm.getUTCFullYear(),
        tomorrowHcm.getUTCMonth(),
        tomorrowHcm.getUTCDate(),
        0,
        0,
        0,
        0
      )
    )
  }

  //#endregion

  /**
   * Lấy GoogleGenerativeAI instance dựa trên model name
   * Chỉ sử dụng API Key (không dùng Service Account)
   * @param modelName - Tên model Gemini
   */
  private getGenAIForModel(modelName: string): GoogleGenerativeAI {
    const normalizedModelName = modelName.toLowerCase()
    const isFlashModel = normalizedModelName.includes('flash')

    // Nếu là Flash model
    if (isFlashModel) {
      // Kiểm tra cache
      if (this.genAIFlash) {
        return this.genAIFlash
      }

      // Ưu tiên dùng Flash API key nếu có
      const flashApiKey = this.geminiConfig?.flashApiKey || ''
      if (flashApiKey && flashApiKey.trim() !== '') {
        this.genAIFlash = this.initializeWithApiKey(flashApiKey, 'Flash')
        return this.genAIFlash
      }

      // Fallback về regular API key nếu có
      const apiKey = this.geminiConfig?.apiKey || ''
      if (apiKey && apiKey.trim() !== '') {
        this.logger.warn(
          'GEMINI_FLASH_API_KEY not found, using GEMINI_API_KEY for Flash model'
        )
        this.genAIFlash = this.initializeWithApiKey(apiKey, 'Flash (fallback)')
        return this.genAIFlash
      }

      throw new Error(
        'No API key configured for Flash models. Please set GEMINI_FLASH_API_KEY or GEMINI_API_KEY in .env'
      )
    }

    // Nếu là Pro model hoặc model khác
    // Kiểm tra cache
    if (this.genAI) {
      return this.genAI
    }

    // Dùng regular API key
    const apiKey = this.geminiConfig?.apiKey || ''
    if (!apiKey || apiKey.trim() === '') {
      throw new Error(
        'GEMINI_API_KEY is required but not configured. Please set GEMINI_API_KEY in your .env file'
      )
    }

    const modelType = normalizedModelName.includes('embedding') ? 'Embedding' : 'Pro'
    this.genAI = this.initializeWithApiKey(apiKey, modelType)
    return this.genAI
  }

  /**
   * Seed/update default Gemini configs into database
   */
  async seedDefaultConfigs(): Promise<{
    updated: number
    created: number
    restored: number
    summary: Array<{ configType: string; modelName: string; isActive: boolean }>
  }> {
    let updated = 0
    let created = 0
    let restored = 0

    for (const config of GEMINI_DEFAULT_CONFIGS) {
      try {
        const existing = await (this.prisma as any).geminiConfig.findUnique({
          where: { configType: config.configType as GeminiConfigType }
        })

        if (existing && !existing.deletedAt) {
          await (this.prisma as any).geminiConfig.update({
            where: { configType: config.configType as GeminiConfigType },
            data: {
              modelName: config.modelName,
              prompt: config.prompt,
              isActive: config.isActive
            }
          })
          updated++
        } else if (existing && existing.deletedAt) {
          await (this.prisma as any).geminiConfig.update({
            where: { configType: config.configType as GeminiConfigType },
            data: {
              modelName: config.modelName,
              prompt: config.prompt,
              isActive: config.isActive,
              deletedAt: null,
              deletedById: null
            }
          })
          restored++
        } else {
          await (this.prisma as any).geminiConfig.create({
            data: {
              configType: config.configType as GeminiConfigType,
              modelName: config.modelName,
              prompt: config.prompt,
              isActive: config.isActive
            }
          })
          created++
        }
      } catch (err) {
        this.logger.error(`Seed config failed for ${config.configType}:`, err)
      }
    }

    const all = await (this.prisma as any).geminiConfig.findMany({
      where: { deletedAt: null },
      select: { configType: true, modelName: true, isActive: true }
    })

    return { updated, created, restored, summary: all }
  }

  /**
   * Khởi tạo GoogleGenerativeAI với API key
   */
  private initializeWithApiKey(
    apiKey: string,
    modelType: string = ''
  ): GoogleGenerativeAI {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is required but not provided')
    }

    // Log một phần API key để debug (chỉ log 8 ký tự đầu và cuối)
    const maskedKey =
      apiKey.length > 16
        ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}`
        : '***'
    const typeLabel = modelType ? ` (${modelType})` : ''
    this.logger.log(`Gemini AI${typeLabel} initializing with API key: ${maskedKey}`)

    const genAI = new GoogleGenerativeAI(apiKey)
    this.logger.log(`Gemini AI${typeLabel} initialized successfully`)
    return genAI
  }

  /**
   * @deprecated Sử dụng getGenAIForModel() thay vì method này
   * Lấy GoogleGenerativeAI instance
   */
  private getGenAI(): GoogleGenerativeAI {
    // Default dùng Pro model
    return this.getGenAIForModel('gemini-2.5-pro')
  }

  /**
   * Đánh giá phát âm SPEAKING cho user
   */
  async evaluateSpeaking(
    userId: number,
    questionBankId: number,
    data: EvaluateSpeakingDto
  ): Promise<SpeakingEvaluationResponse> {
    try {
      this.logger.log(
        `Evaluating speaking for user ${userId}, questionBank ${questionBankId}`
      )

      // Kiểm tra questionBank tồn tại và là SPEAKING type
      const questionBank = await this.prisma.questionBank.findUnique({
        where: { id: questionBankId },
        select: {
          id: true,
          questionKey: true,
          questionType: true
        }
      })

      if (!questionBank) {
        throw new BadRequestException('QuestionBank không tồn tại')
      }

      if (questionBank.questionType !== 'SPEAKING') {
        throw new BadRequestException('QuestionBank phải là loại SPEAKING')
      }

      // Lấy config default theo mapping service ↔ config
      const svcCfg = await this.geminiConfigRepo.getDefaultConfigForService(
        'SPEAKING_EVALUATION' as any
      )
      const config: any = svcCfg?.geminiConfig || null
      const prompt = config
        ? this.replacePlaceholders(String(config.prompt || ''), {
            text: data.text,
            transcription: data.transcription || data.text
          })
        : this.buildSpeakingEvaluationPrompt(data.text, data.transcription || data.text)
      const modelName =
        (config?.geminiConfigModel?.geminiModel?.key as string) || 'gemini-1.5-pro'

      // Gọi Gemini API - chọn API key dựa trên model
      const genAI = this.getGenAIForModel(modelName)
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(prompt)
      const response = await result.response

      if (!response) {
        throw new Error('Empty response from Gemini API')
      }

      const text = response.text()
      try {
        this.logger.debug(
          `[RECOMMEND] Raw Gemini text (first 600 chars): ${String(text ?? '').slice(0, 600)}`
        )
      } catch {}

      if (!text || text.trim() === '') {
        throw new Error('Empty text in Gemini API response')
      }

      // Parse response từ Gemini
      const evaluation = this.parseSpeakingEvaluationResponse(text)

      // ĐÃ GỠ: Không còn lưu UserSpeakingAttempt vì model đã bị xoá

      this.logger.log(`Speaking evaluation completed for user ${userId}`)

      return evaluation
    } catch (error) {
      this.logger.error('Error evaluating speaking:', error)
      if (error instanceof BadRequestException) {
        throw error
      }

      // Kiểm tra nếu là lỗi 403 Forbidden (API key issue)
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        error.status === 403
      ) {
        throw new BadRequestException(
          'Lỗi xác thực API key. Vui lòng kiểm tra GEMINI_API_KEY trong file .env'
        )
      }

      throw new BadRequestException(
        'Không thể đánh giá phát âm: ' +
          (error instanceof Error ? error.message : String(error))
      )
    }
  }

  /**
   * Lấy gợi ý cá nhân hóa dựa trên dữ liệu userExercises và userTest
   */
  async getPersonalizedRecommendations(
    userId: number,
    limit: number = 10,
    options?: { createSrs?: boolean; allowedTypes?: string[]; lang?: string }
  ): Promise<PersonalizedRecommendationsResponse> {
    try {
      this.logger.log(`Getting personalized recommendations for user ${userId}`)
      // Cache key: mỗi ngày reset một lần (thêm ngày vào key)
      const today = new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
      const cacheKey = `rec:${userId}:${limit}:${today}`

      // Lấy config default theo mapping service ↔ config
      const svcCfg = await this.geminiConfigRepo.getDefaultConfigForService(
        GeminiConfigType.PERSONALIZED_RECOMMENDATIONS as any
      )

      // this.logger.log(`[RECOMMEND] SvcCfg: ${JSON.stringify(svcCfg)}`)
      const config: any = svcCfg?.geminiConfig || null
      const policy = (config?.geminiConfigModel?.extraParams as any)?.policy

      let analysis: any
      // this.logger.log(`[RECOMMEND] Policy: ${JSON.stringify(policy)}`)
      if (policy) {
        // Lấy dữ liệu theo policy (scope + whitelist + masking)
        const safeData = await this.dataAccessService.getAiSafeData(userId, policy)
        analysis = this.buildSummaryFromSafeData(safeData, limit)

        // Tạo hash từ analysis để kiểm tra dữ liệu có thay đổi không
        const currentDataHash = this.createDataHash(analysis)

        // Kiểm tra cache và trả về nếu có (cùng ngày hoặc ngày hôm trước nếu dữ liệu không đổi)
        const cachedResult = await this.getCachedRecommendations(
          userId,
          limit,
          cacheKey,
          currentDataHash,
          today
        )
        if (cachedResult) {
          return cachedResult
        }
        // this.logger.log(`[RECOMMEND] Analysis: ${JSON.stringify(analysis)}`)
        // this.logger.log(`[RECOMMEND] SafeData: ${JSON.stringify(safeData)}`)
        // this.logger.log(`[RECOMMEND] Limit: ${limit}`)
        // this.logger.log(`[RECOMMEND] Config: ${JSON.stringify(config)}`)
        // this.logger.log(`[RECOMMEND] UserId: ${userId}`)
        // this.logger.log(`[RECOMMEND] Options: ${JSON.stringify(options)}`)
      } else {
        // Bắt buộc phải có policy, nếu không thì từ chối xử lý
        throw new BadRequestException(
          'PERSONALIZED_RECOMMENDATIONS policy is required but not configured'
        )
      }

      // Xác định ngôn ngữ cho reason (vi: tiếng Việt, en: tiếng Anh)
      const lang = options?.lang || 'vi'
      const languageInstruction =
        lang === 'en'
          ? 'Write all "reason" and "message" fields in English.'
          : 'Viết tất cả các trường "reason" và "message" bằng tiếng Việt.'

      const prompt = config
        ? this.replacePlaceholders(String(config.prompt || ''), {
            analysis: JSON.stringify(analysis),
            limit: limit.toString(),
            languageInstruction: languageInstruction
          })
        : this.buildRecommendationPrompt(analysis, limit, lang)
      // Chỉ dùng model từ config, không cho override từ request
      const modelName =
        (config?.geminiConfigModel?.geminiModel?.key as string) || 'gemini-2.5-flash'

      // Gọi Gemini API - chọn API key dựa trên model
      const genAI = this.getGenAIForModel(modelName)
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(prompt)

      const response = await result.response
      this.logger.warn(`[RECOMMEND] Response: ${response}`)
      if (!response) {
        throw new Error('Empty response from Gemini API')
      }

      const text = response.text()

      if (!text || text.trim() === '') {
        throw new Error('Empty text in Gemini API response')
      }

      // Parse và validate recommendations từ Gemini response
      let recommendations = this.parseAndValidateRecommendations(text, analysis, options)

      const payload: PersonalizedRecommendationsResponse = {
        recommendations: recommendations.slice(0, limit),
        summary: analysis
      }

      // Xử lý SRS và lưu recommendations vào DB
      await this.processSrsAndSaveRecommendations(userId, payload, options, modelName)

      // Cache kết quả trong 1 ngày (86400000 milliseconds = 24 giờ)
      // Mục đích: Chỉ cho phép gọi Gemini API 1 lần mỗi ngày cho mỗi user (nếu dữ liệu không đổi)
      // Cache key bao gồm ngày (YYYY-MM-DD) nên sẽ tự động reset vào ngày mới
      // Tính expireAt đến cuối ngày hôm nay (23:59:59.999)
      // Lưu kèm dataHash để kiểm tra dữ liệu có thay đổi không
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)
      const expireAt = endOfDay.getTime()
      const dataHash = this.createDataHash(analysis)

      // Tính TTL (seconds) từ bây giờ đến cuối ngày
      const ttlSeconds = Math.ceil((expireAt - Date.now()) / 1000)

      // Lưu vào Redis với TTL tự động
      const redisKey = `${this.CACHE_PREFIX}${cacheKey}`
      const cacheData = JSON.stringify({ value: payload, expireAt, dataHash })
      await this.redisClient.setex(redisKey, ttlSeconds, cacheData)

      this.logger.log(
        `[RECOMMEND] Cached result in Redis for user ${userId} until end of day (${today}) with dataHash: ${dataHash.substring(0, 8)}... (TTL: ${ttlSeconds}s)`
      )
      return payload
    } catch (error) {
      this.logger.error('Error getting personalized recommendations:', error)

      // Kiểm tra nếu là lỗi 403 Forbidden (API key issue)
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        error.status === 403
      ) {
        throw new BadRequestException(
          'Lỗi xác thực API key. Vui lòng kiểm tra GEMINI_API_KEY trong file .env'
        )
      }

      throw new BadRequestException(
        'Không thể lấy gợi ý cá nhân hóa: ' +
          (error instanceof Error ? error.message : String(error))
      )
    }
  }

  // === Saved recommendations (DB) ===
  async listSavedRecommendations(
    userId: number,
    status?: 'PENDING' | 'DONE' | 'DISMISSED',
    limit: number = 50,
    lang: string = 'vi'
  ) {
    const where: any = { userId }
    if (status) where.status = status
    const rows = await (this.prisma as any).userAIRecommendation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Lấy thông tin question cho các item có targetType = QUESTION_BANK
    const questionBankMap = await this.getQuestionBankMapForRecommendations(rows)

    // Chuẩn hoá UI với hỗ trợ đa ngôn ngữ
    const title = lang === 'en' ? 'Review to improve' : 'Làm lại để cải thiện'
    return {
      title,
      items: rows.map((r: any) => {
        const item: any = {
          type: r.targetType.toLowerCase(),
          id: r.targetId,
          reason: r.reason,
          status: r.status,
          createdAt: r.createdAt
        }

        // Thêm thông tin question nếu là QUESTION_BANK
        if (r.targetType === 'QUESTION_BANK' && questionBankMap[r.targetId]) {
          const question = questionBankMap[r.targetId]
          item.question = {
            questionJp: question.questionJp,
            questionType: question.questionType,
            levelN: question.levelN,
            audioUrl: question.audioUrl
          }
        }

        return item
      })
    }
  }

  async listMyRecommendations(userId: number, limit: number = 50, lang: string = 'vi') {
    const where: any = { userId }
    if (status) where.status = status
    const rows = await (this.prisma as any).userAIRecommendation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Lấy thông tin question cho các item có targetType = QUESTION_BANK
    const questionBankMap = await this.getQuestionBankMapForRecommendations(rows)

    // Chuẩn hoá UI với hỗ trợ đa ngôn ngữ
    const title = lang === 'en' ? 'Review to improve' : 'Làm lại để cải thiện'
    return {
      title,
      items: rows.map((r: any) => {
        const item: any = {
          type: r.targetType.toLowerCase(),
          id: r.targetId,
          reason: r.reason,
          status: r.status,
          createdAt: r.createdAt
        }

        // Thêm thông tin question nếu là QUESTION_BANK
        if (r.targetType === 'QUESTION_BANK' && questionBankMap[r.targetId]) {
          const question = questionBankMap[r.targetId]
          item.question = {
            questionJp: question.questionJp,
            questionType: question.questionType,
            levelN: question.levelN,
            audioUrl: question.audioUrl
          }
        }

        return item
      })
    }
  }

  /**
   * Build compact analysis from safeData (policy result) to minimize tokens
   * Focus on incorrect answers for SRS mapping
   */
  private buildSummaryFromSafeData(safeData: Record<string, any[]>, limit: number) {
    // Data đã được limit ở DataAccessService theo policy config, không cần slice nữa
    const answerLogs = safeData['UserAnswerLog'] || []
    const testAnswerLogs = safeData['UserTestAnswerLog'] || []
    const exerciseAttempts = safeData['UserExerciseAttempt'] || []
    const testAttempts = safeData['UserTestAttempt'] || []
    const questionBanks = safeData['QuestionBank'] || []
    const answers = safeData['Answer'] || []
    const vocabularies = safeData['Vocabulary'] || []
    const kanjiList = safeData['Kanji'] || []
    const grammarList = safeData['Grammar'] || []
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
        // Thêm question types từ test answer logs
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
        // Thêm question types từ answer logs
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
      vocabularies: vocabularies.map((v: any) => ({
        id: v.id,
        wordJp: v.wordJp,
        reading: v.reading,
        levelN: v.levelN
      })),
      kanji: kanjiList.map((k: any) => ({
        id: k.id,
        character: k.character,
        jlptLevel: k.jlptLevel
      })),
      grammar: grammarList.map((g: any) => ({
        id: g.id,
        structure: g.structure,
        level: g.level
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

  /**
   * Lấy map thông tin QuestionBank cho các recommendations có targetType = QUESTION_BANK
   * @param recommendations Danh sách recommendations
   * @returns Map với key là questionBankId, value là thông tin question
   */
  private async getQuestionBankMapForRecommendations(
    recommendations: any[]
  ): Promise<Record<number, any>> {
    const questionBankIds = recommendations
      .filter((r: any) => r.targetType === 'QUESTION_BANK')
      .map((r: any) => r.targetId)

    if (questionBankIds.length === 0) {
      return {}
    }

    const questions = await (this.prisma as any).questionBank.findMany({
      where: { id: { in: questionBankIds } },
      select: {
        id: true,
        questionJp: true,
        questionType: true,
        levelN: true,
        audioUrl: true
      }
    })

    return questions.reduce((acc: any, q: any) => {
      acc[q.id] = q
      return acc
    }, {})
  }

  async updateRecommendationStatus(
    userId: number,
    id: number,
    status: 'DONE' | 'DISMISSED'
  ) {
    const rec = await (this.prisma as any).userAIRecommendation.findFirst({
      where: { id, userId }
    })
    if (!rec)
      throw new (require('@nestjs/common').BadRequestException)(
        'Recommendation không tồn tại'
      )
    const updated = await (this.prisma as any).userAIRecommendation.update({
      where: { id },
      data: { status }
    })
    return { id: updated.id, status: updated.status }
  }

  /**
   * AI Kaiwa - Hội thoại với AI bằng tiếng Nhật
   */
  async aiKaiwa(userId: number, data: AIKaiwaDto): Promise<AIKaiwaResponse> {
    try {
      this.logger.log(
        `AI Kaiwa request from user ${userId}, conversationId: ${data.conversationId || 'new'}`
      )

      // Validate input: phải có message hoặc audioUrl
      if (!data.message && !data.audioUrl) {
        throw new BadRequestException('Phải có message hoặc audioUrl')
      }

      let userMessage: string = data.message || ''
      let transcription: string | undefined = undefined
      let pronunciationAssessment: any = undefined

      // Nếu có audioUrl, convert audio sang text bằng Speech-to-Text
      if (data.audioUrl) {
        try {
          this.logger.log(`Converting audio to text: ${data.audioUrl}`)

          // Download audio file
          const audioResponse = await axios.get(data.audioUrl, {
            responseType: 'arraybuffer'
          })
          const audioBuffer = Buffer.from(audioResponse.data)

          // Convert audio to text
          const speechResult = await this.speechToTextService.convertAudioToText(
            audioBuffer,
            {
              languageCode: 'ja-JP',
              enableAutomaticPunctuation: true
            }
          )

          transcription = speechResult.transcript
          userMessage = transcription || userMessage // Ưu tiên transcription nếu có

          this.logger.log(
            `Speech-to-Text result: ${transcription} (confidence: ${speechResult.confidence})`
          )

          // Đánh giá phát âm nếu có reference text và assessPronunciation = true
          if (data.assessPronunciation && data.message && transcription) {
            try {
              // Option 1: Sử dụng SpeakingService để đánh giá (đơn giản hơn, dựa trên confidence)
              // Option 2: Sử dụng Gemini để đánh giá chi tiết hơn

              // Tái sử dụng logic từ SpeakingService - chỉ tính toán dựa trên confidence
              const baseScore = Math.min(speechResult.confidence * 100, 100)
              const accuracy = Math.round(baseScore)
              const pronunciationScore = Math.round(
                baseScore * 0.9 + (transcription.length > 0 ? 10 : 0)
              )
              const fluencyScore = Math.round(
                baseScore * 0.85 + (speechResult.confidence > 0.8 ? 15 : 0)
              )
              const overallScore = Math.round(
                accuracy * 0.4 + pronunciationScore * 0.3 + fluencyScore * 0.3
              )

              // So sánh với reference text bằng Gemini để có đánh giá chi tiết hơn
              const svcCfg = await this.geminiConfigRepo.getDefaultConfigForService(
                'SPEAKING_EVALUATION' as any
              )
              const config: any = svcCfg?.geminiConfig || null
              const prompt = config
                ? this.replacePlaceholders(String(config.prompt || ''), {
                    text: data.message,
                    transcription: transcription
                  })
                : this.buildSpeakingEvaluationPrompt(data.message, transcription)

              const modelName =
                (config?.geminiConfigModel?.geminiModel?.key as string) ||
                'gemini-1.5-pro'
              const genAI = this.getGenAIForModel(modelName)
              const model = genAI.getGenerativeModel({ model: modelName })
              const result = await model.generateContent(prompt)
              const response = await result.response
              const evaluationText = response.text()

              if (evaluationText) {
                const evaluation = this.parseSpeakingEvaluationResponse(evaluationText)
                pronunciationAssessment = {
                  accuracy: evaluation.accuracy,
                  pronunciation: evaluation.pronunciation,
                  fluency: evaluation.fluency,
                  overallScore: evaluation.overallScore,
                  feedback: evaluation.feedback,
                  suggestions: evaluation.suggestions,
                  confidence: speechResult.confidence
                }
                this.logger.log(
                  `Pronunciation assessment completed: ${evaluation.overallScore}/100`
                )
              } else {
                // Fallback: dùng scores từ SpeakingService logic
                let feedback = ''
                if (overallScore >= 90) {
                  feedback = 'Phát âm xuất sắc! Hãy tiếp tục luyện tập.'
                } else if (overallScore >= 80) {
                  feedback = 'Phát âm tốt, cần cải thiện một chút về độ trôi chảy.'
                } else if (overallScore >= 70) {
                  feedback = 'Phát âm khá tốt, hãy luyện tập thêm để cải thiện.'
                } else if (overallScore >= 60) {
                  feedback = 'Cần luyện tập thêm về phát âm và độ trôi chảy.'
                } else {
                  feedback = 'Hãy luyện tập nhiều hơn để cải thiện phát âm.'
                }

                pronunciationAssessment = {
                  accuracy,
                  pronunciation: pronunciationScore,
                  fluency: fluencyScore,
                  overallScore,
                  feedback,
                  suggestions: [],
                  confidence: speechResult.confidence
                }
              }
            } catch (evalError) {
              this.logger.warn(
                'Failed to assess pronunciation, continuing without assessment:',
                evalError
              )
              // Không throw error, chỉ log warning
            }
          }
        } catch (audioError) {
          this.logger.error('Failed to process audio:', audioError)
          throw new BadRequestException(
            'Không thể xử lý audio file: ' +
              (audioError instanceof Error ? audioError.message : String(audioError))
          )
        }
      }

      if (!userMessage || userMessage.trim() === '') {
        throw new BadRequestException('Không thể lấy được message từ audio hoặc text')
      }

      // Generate hoặc dùng conversationId có sẵn
      const conversationId =
        data.conversationId || `conv_${userId}_${Date.now()}_${uuidv4().substring(0, 8)}`

      // Lấy lịch sử hội thoại (nếu có)
      const conversationHistory = await (this.prisma as any).userAIConversation.findMany({
        where: {
          userId,
          conversationId,
          deletedAt: null
        },
        orderBy: {
          createdAt: 'asc'
        },
        take: 20 // Lấy 20 messages gần nhất
      })

      // Xây dựng conversation context cho Gemini
      const history = conversationHistory.map((conv) => ({
        role: conv.role === 'USER' ? 'user' : 'model',
        parts: [{ text: conv.message }]
      }))

      // Thêm message hiện tại của user
      history.push({
        role: 'user',
        parts: [{ text: userMessage }]
      })

      // Lấy config default theo mapping service ↔ config
      const svcCfg = await this.geminiConfigRepo.getDefaultConfigForService(
        'AI_KAIWA' as any
      )
      const config: any = svcCfg?.geminiConfig || null
      const modelName =
        (config?.geminiConfigModel?.geminiModel?.key as string) || 'gemini-1.5-pro'

      // System prompt từ config hoặc default
      const systemPrompt =
        (config?.prompt as string) ||
        `Bạn là một người bạn Nhật Bản thân thiện và nhiệt tình. Hãy trò chuyện tự nhiên bằng tiếng Nhật với người học. Hãy:
- Trả lời ngắn gọn, tự nhiên như đang trò chuyện với bạn
- Sử dụng ngôn ngữ phù hợp với trình độ người học
- Động viên và tạo động lực cho người học
- Đưa ra gợi ý về cách cải thiện nếu có lỗi
- Giữ cuộc trò chuyện vui vẻ và thú vị`

      // Gọi Gemini API - chọn API key dựa trên model
      const genAI = this.getGenAIForModel(modelName)
      const model = genAI.getGenerativeModel({ model: modelName })

      // Tạo chat session với history
      const chat = model.startChat({
        history: history.slice(0, -1) as any, // Bỏ message cuối (message hiện tại)
        systemInstruction: systemPrompt
      })

      // Gửi message và nhận response
      const result = await chat.sendMessage(userMessage as any)
      const response = await result.response
      const aiResponse = response.text()

      if (!aiResponse || aiResponse.trim() === '') {
        throw new Error('Empty response from Gemini API')
      }

      // Lưu user message vào DB (lưu cả message gốc và transcription nếu có)
      const userMessageToSave =
        data.audioUrl && transcription ? `[Audio] ${transcription}` : userMessage

      await (this.prisma as any).userAIConversation.create({
        data: {
          userId,
          conversationId,
          role: 'USER',
          message: userMessageToSave
        }
      })

      // Lưu AI response vào DB (tạm thời chưa có audioUrl)
      const aiConversation = await (this.prisma as any).userAIConversation.create({
        data: {
          userId,
          conversationId,
          role: 'AI',
          message: aiResponse,
          audioUrl: null
        }
      })

      let audioUrl: string | undefined = undefined

      // Convert to audio nếu includeAudio = true
      if (data.includeAudio !== false) {
        try {
          const audioResult = await this.textToSpeechService.convertTextToSpeech(
            aiResponse,
            {
              languageCode: 'ja-JP',
              voiceName: 'ja-JP-Wavenet-A',
              audioEncoding: 'MP3'
            }
          )

          // Upload audio lên cloud (tạo file object tạm từ buffer)
          const audioFile = {
            buffer: audioResult.audioContent,
            originalname: `ai-kaiwa-${aiConversation.id}.mp3`,
            mimetype: 'audio/mpeg',
            size: audioResult.audioContent.length
          } as Express.Multer.File

          const uploadResult = await this.uploadService.uploadFile(audioFile, 'ai-kaiwa')
          audioUrl = uploadResult.url

          // Update audioUrl trong DB
          await (this.prisma as any).userAIConversation.update({
            where: { id: aiConversation.id },
            data: { audioUrl }
          })

          this.logger.log(`Generated audio for AI response: ${audioUrl}`)
        } catch (audioError) {
          this.logger.warn(
            'Failed to generate audio, continuing without audio:',
            audioError
          )
          // Không throw error, chỉ log warning và tiếp tục
        }
      }

      this.logger.log(
        `AI Kaiwa completed for user ${userId}, conversationId: ${conversationId}`
      )

      return {
        conversationId,
        message: aiResponse,
        audioUrl,
        pronunciationAssessment,
        transcription
      }
    } catch (error) {
      this.logger.error('Error in AI Kaiwa:', error)
      if (error instanceof BadRequestException) {
        throw error
      }

      // Kiểm tra nếu là lỗi 403 Forbidden (API key issue)
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        error.status === 403
      ) {
        throw new BadRequestException(
          'Lỗi xác thực API key. Vui lòng kiểm tra GEMINI_API_KEY trong file .env'
        )
      }

      throw new BadRequestException(
        'Không thể thực hiện hội thoại AI: ' +
          (error instanceof Error ? error.message : String(error))
      )
    }
  }

  /**
   * Chat với Gemini - API đơn giản chỉ text, không có audio/pronunciation assessment
   */
  async chatWithGemini(
    userId: number,
    data: ChatWithGeminiDto
  ): Promise<ChatWithGeminiResponse> {
    try {
      this.logger.log(
        `Chat with Gemini request from user ${userId}, conversationId: ${data.conversationId || 'new'}`
      )

      // Validate input
      if (!data.message || data.message.trim() === '') {
        throw new BadRequestException('Message không được để trống')
      }

      // Generate hoặc dùng conversationId có sẵn
      const conversationId =
        data.conversationId || `chat_${userId}_${Date.now()}_${uuidv4().substring(0, 8)}`

      // Lấy lịch sử hội thoại (nếu có và saveHistory = true)
      let history: any[] = []
      if (data.saveHistory !== false) {
        const conversationHistory = await (
          this.prisma as any
        ).userAIConversation.findMany({
          where: {
            userId,
            conversationId,
            deletedAt: null
          },
          orderBy: {
            createdAt: 'asc'
          },
          take: 20 // Lấy 20 messages gần nhất
        })

        // Xây dựng conversation context cho Gemini
        history = conversationHistory.map((conv) => ({
          role: conv.role === 'USER' ? 'user' : 'model',
          parts: [{ text: conv.message }]
        }))
      }

      // Thêm message hiện tại của user
      history.push({
        role: 'user',
        parts: [{ text: data.message }]
      })

      // Chọn model - nếu là enum thì lấy value, nếu là string thì dùng trực tiếp
      let modelName: string
      if (!data.modelName) {
        modelName = 'gemini-2.5-pro'
      } else if (typeof data.modelName === 'string') {
        modelName = data.modelName
      } else {
        // Nếu là enum, lấy giá trị của enum
        modelName = data.modelName as string
      }
      this.logger.log(`Using model: ${modelName}`)

      // Gọi Gemini API - chọn API key dựa trên model
      const genAI = this.getGenAIForModel(modelName)
      const model = genAI.getGenerativeModel({ model: modelName })

      // Tạo chat session với history
      const chat = model.startChat({
        history: history.slice(0, -1) as any // Bỏ message cuối (message hiện tại)
      })

      // Gửi message và nhận response
      const result = await chat.sendMessage(data.message as any)
      const response = await result.response
      const aiResponse = response.text()

      if (!aiResponse || aiResponse.trim() === '') {
        throw new Error('Empty response from Gemini API')
      }

      // Lưu vào DB nếu saveHistory = true
      if (data.saveHistory !== false) {
        try {
          // Lưu user message vào DB
          await (this.prisma as any).userAIConversation.create({
            data: {
              userId,
              conversationId,
              role: 'USER',
              message: data.message
            }
          })

          // Lưu AI response vào DB
          await (this.prisma as any).userAIConversation.create({
            data: {
              userId,
              conversationId,
              role: 'AI',
              message: aiResponse
            }
          })
        } catch (dbError) {
          this.logger.warn('Failed to save conversation history to DB:', dbError)
          // Không throw error, chỉ log warning
        }
      }

      this.logger.log(
        `Chat with Gemini completed for user ${userId}, conversationId: ${conversationId}`
      )

      return {
        conversationId,
        message: aiResponse,
        modelUsed: modelName
      }
    } catch (error) {
      this.logger.error('Error in chat with Gemini:', error)
      if (error instanceof BadRequestException) {
        throw error
      }

      // Kiểm tra nếu là lỗi 403 Forbidden (API key issue)
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        error.status === 403
      ) {
        throw new BadRequestException(
          'Lỗi xác thực API key. Vui lòng kiểm tra GEMINI_API_KEY hoặc GEMINI_FLASH_API_KEY trong file .env'
        )
      }

      throw new BadRequestException(
        'Không thể chat với Gemini: ' +
          (error instanceof Error ? error.message : String(error))
      )
    }
  }

  /**
   * Test model gemini-2.5-flash-native-audio-dialog
   * Hàm cơ bản để test model native audio dialog
   */
  /**
   * Scores a short Japanese recording against referenceText. The API key stays
   * on the server (it used to ship inside the mobile app). Returns the model's
   * JSON as is, or {} when it is not valid JSON, like the app did.
   */
  async assessPronunciation(
    audio: Express.Multer.File,
    referenceText: string
  ): Promise<Record<string, unknown>> {
    const parts = [
      { text: `Reference Text (Japanese): ${referenceText}` },
      { inlineData: { mimeType: audio.mimetype, data: audio.buffer.toString('base64') } }
    ]

    let lastError: unknown
    for (const modelName of PRONUNCIATION_MODELS) {
      try {
        const model = this.getGenAIForModel(modelName).getGenerativeModel({
          model: modelName,
          systemInstruction: PRONUNCIATION_SYSTEM_INSTRUCTION,
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
        })
        const result = await model.generateContent({
          contents: [{ role: 'user', parts }]
        })
        const raw = result.response.text()
        try {
          const parsed: unknown = raw ? JSON.parse(raw) : {}
          return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : {}
        } catch {
          return {}
        }
      } catch (error) {
        lastError = error
        const status = (error as { status?: number })?.status
        if (status === 404) {
          this.logger.warn(`Pronunciation model ${modelName} unavailable, trying next`)
          continue
        }
        break
      }
    }

    this.logger.error('Pronunciation assessment failed', lastError as Error)
    throw new BadGatewayException('Không thể đánh giá phát âm lúc này, vui lòng thử lại')
  }

  async testNativeAudioDialog(
    userId: number,
    data: TestNativeAudioDialogDto
  ): Promise<TestNativeAudioDialogResponse> {
    try {
      this.logger.log(`Testing native audio dialog model for user ${userId}`)

      // NOTE: native-audio-dialog không hỗ trợ qua REST generateContent (404)
      // Dùng model hỗ trợ audio understanding qua REST để test nhanh
      const modelName = 'gemini-2.5-flash'

      // Validate input: phải có message hoặc audioUrl
      if (!data.message && !data.audioUrl) {
        throw new BadRequestException('Phải có message hoặc audioUrl')
      }

      // Generate hoặc dùng conversationId có sẵn
      const conversationId =
        data.conversationId ||
        `audio_dialog_${userId}_${Date.now()}_${uuidv4().substring(0, 8)}`

      // Gọi Gemini API - chọn API key dựa trên model (Flash model)
      const genAI = this.getGenAIForModel(modelName)
      const model = genAI.getGenerativeModel({ model: modelName })

      // Chuẩn bị input
      let inputParts: any[] = []

      if (data.audioUrl) {
        // Nếu có audioUrl, download audio và convert sang format phù hợp
        try {
          const audioResponse = await axios.get(data.audioUrl, {
            responseType: 'arraybuffer'
          })
          const audioBuffer = Buffer.from(audioResponse.data)

          // Convert audio buffer thành base64 hoặc format phù hợp với Gemini API
          // Model native audio dialog có thể nhận audio trực tiếp
          const audioBase64 = audioBuffer.toString('base64')

          inputParts.push({
            inlineData: {
              mimeType: 'audio/mpeg', // Hoặc detect từ file
              data: audioBase64
            }
          })

          this.logger.log(`Added audio input from URL: ${data.audioUrl}`)
        } catch (audioError) {
          this.logger.error('Failed to download/process audio:', audioError)
          throw new BadRequestException(
            'Không thể xử lý audio file: ' +
              (audioError instanceof Error ? audioError.message : String(audioError))
          )
        }
      }

      if (data.message) {
        // Nếu có message, thêm text input
        inputParts.push({ text: data.message })
        this.logger.log(`Added text input: ${data.message}`)
      }

      // Gọi API với input parts
      this.logger.log(`Calling ${modelName} with ${inputParts.length} input parts`)
      const result = await model.generateContent(inputParts)
      const response = await result.response

      if (!response) {
        throw new Error('Empty response from Gemini API')
      }

      // Lấy text response nếu có
      let message: string | undefined = undefined
      try {
        const text = response.text()
        if (text && text.trim() !== '') {
          message = text
        }
      } catch (textError) {
        this.logger.warn('No text response available:', textError)
      }

      // Lấy audio response nếu có (đa số REST models chỉ trả text; audio out cần Realtime API hoặc TTS)
      let audioResponse: Buffer | string | undefined = undefined
      try {
        // Kiểm tra xem response có audio parts không
        const candidates = response.candidates?.[0]
        if (candidates?.content?.parts) {
          for (const part of candidates.content.parts) {
            if (part.inlineData?.mimeType?.startsWith('audio/')) {
              // Nếu có audio response
              const audioData = part.inlineData.data
              if (audioData) {
                audioResponse = Buffer.from(audioData, 'base64')
                this.logger.log(`Received audio response from model`)
                break
              }
            }
          }
        }
      } catch (audioError) {
        this.logger.warn('No audio response available:', audioError)
      }

      this.logger.log(
        `Native audio dialog test completed for user ${userId}, conversationId: ${conversationId}`
      )

      return {
        conversationId,
        message,
        audioResponse,
        rawResponse: response // Để debug
      }
    } catch (error) {
      this.logger.error('Error testing native audio dialog:', error)
      if (error instanceof BadRequestException) {
        throw error
      }

      // Kiểm tra nếu là lỗi 403 Forbidden (API key issue)
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        error.status === 403
      ) {
        throw new BadRequestException(
          'Lỗi xác thực API key. Vui lòng kiểm tra GEMINI_API_KEY hoặc GEMINI_FLASH_API_KEY trong file .env'
        )
      }

      throw new BadRequestException(
        'Không thể test native audio dialog: ' +
          (error instanceof Error ? error.message : String(error))
      )
    }
  }

  /**
   * Replace placeholders trong prompt template
   */
  private replacePlaceholders(
    template: string,
    variables: Record<string, string>
  ): string {
    let result = template
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }
    return result
  }

  /**
   * Kiểm tra cache recommendations từ Redis
   * Kiểm tra cache của ngày hôm nay, nếu không có thì kiểm tra ngày hôm trước
   * @param userId ID của user
   * @param limit Số lượng recommendations
   * @param cacheKey Cache key cho ngày hôm nay
   * @param currentDataHash Hash của dữ liệu hiện tại
   * @param today Ngày hôm nay (YYYY-MM-DD)
   * @returns Cached recommendations nếu tìm thấy và dataHash khớp, null nếu không
   */
  private async getCachedRecommendations(
    userId: number,
    limit: number,
    cacheKey: string,
    currentDataHash: string,
    today: string
  ): Promise<PersonalizedRecommendationsResponse | null> {
    // Kiểm tra cache từ Redis cho ngày hôm nay
    const redisKey = `${this.CACHE_PREFIX}${cacheKey}`
    const cachedData = await this.redisClient.get(redisKey)

    if (cachedData) {
      try {
        const cached = JSON.parse(cachedData)
        const now = Date.now()
        if (cached.expireAt > now && cached.dataHash === currentDataHash) {
          // Cache còn hiệu lực và dữ liệu không đổi -> trả về cache
          this.logger.debug(
            `[RECOMMEND] Returning cached result from Redis for user ${userId} (data unchanged)`
          )
          return cached.value
        } else if (cached.dataHash !== currentDataHash) {
          // Dữ liệu đã thay đổi -> xóa cache cũ và tiếp tục gọi API
          await this.redisClient.del(redisKey)
          this.logger.log(
            `[RECOMMEND] Data changed for user ${userId}, invalidating cache and fetching new recommendations`
          )
        }
      } catch (error) {
        this.logger.warn(
          `[RECOMMEND] Failed to parse cached data, will fetch new recommendations: ${error}`
        )
      }
    } else {
      // Không có cache cho ngày hôm nay -> kiểm tra cache của ngày hôm trước
      // Nếu dữ liệu không đổi, có thể tái sử dụng cache cũ
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      const yesterdayCacheKey = `rec:${userId}:${limit}:${yesterdayStr}`
      const yesterdayRedisKey = `${this.CACHE_PREFIX}${yesterdayCacheKey}`
      const yesterdayCachedData = await this.redisClient.get(yesterdayRedisKey)

      if (yesterdayCachedData) {
        try {
          const yesterdayCached = JSON.parse(yesterdayCachedData)
          if (yesterdayCached.dataHash === currentDataHash) {
            // Dữ liệu không đổi so với ngày hôm trước -> tái sử dụng cache
            this.logger.log(
              `[RECOMMEND] Data unchanged from yesterday for user ${userId}, reusing previous cache`
            )

            // Cập nhật cache cho ngày hôm nay với dữ liệu cũ
            const endOfDay = new Date()
            endOfDay.setHours(23, 59, 59, 999)
            const expireAt = endOfDay.getTime()
            const ttlSeconds = Math.ceil((expireAt - Date.now()) / 1000)
            const cacheData = JSON.stringify({
              value: yesterdayCached.value,
              expireAt,
              dataHash: currentDataHash
            })
            await this.redisClient.setex(redisKey, ttlSeconds, cacheData)

            return yesterdayCached.value
          }
        } catch (error) {
          this.logger.warn(
            `[RECOMMEND] Failed to parse yesterday's cached data: ${error}`
          )
        }
      }
    }

    return null
  }

  /**
   * Tạo hash từ dữ liệu analysis để kiểm tra dữ liệu có thay đổi không
   * @param analysis Dữ liệu analysis từ buildSummaryFromSafeData
   * @returns Hash string (SHA256) của dữ liệu
   */
  private createDataHash(analysis: any): string {
    // Tạo JSON string từ analysis, loại bỏ các field không quan trọng (như createdAt nếu có)
    // Chỉ lấy các field quan trọng ảnh hưởng đến recommendations
    const relevantData = {
      recentIncorrect: analysis.recentIncorrect?.map((item: any) => ({
        questionBankId: item.questionBankId,
        questionType: item.questionType,
        levelN: item.levelN
      })),
      srs: analysis.srs,
      vocabularies: analysis.vocabularies?.map((v: any) => ({
        id: v.id,
        wordJp: v.wordJp,
        reading: v.reading
      })),
      kanji: analysis.kanji?.map((k: any) => ({ id: k.id, character: k.character })),
      grammar: analysis.grammar?.map((g: any) => ({ id: g.id, structure: g.structure })),
      failedTests: analysis.failedTests,
      failedExercises: analysis.failedExercises
    }

    const jsonString = JSON.stringify(relevantData)
    return crypto.createHash('sha256').update(jsonString).digest('hex')
  }

  /**
   * Build prompt cho đánh giá SPEAKING (default)
   */
  private buildSpeakingEvaluationPrompt(text: string, transcription: string): string {
    return `Bạn là giáo viên tiếng Nhật chuyên nghiệp. Hãy đánh giá phát âm tiếng Nhật của học viên.

Câu cần phát âm: "${text}"
Transcription từ audio của học viên: "${transcription}"

Hãy đánh giá theo 4 tiêu chí (thang điểm 0-100):
1. Accuracy (Độ chính xác): Đánh giá mức độ chính xác về cách phát âm, ngữ điệu, trọng âm
2. Pronunciation (Phát âm): Đánh giá cách phát âm từng âm tiết, thanh điệu
3. Fluency (Độ trôi chảy): Đánh giá tốc độ nói, ngắt nghỉ tự nhiên
4. Overall Score (Điểm tổng): Điểm trung bình của 3 tiêu chí trên

Trả về JSON với format:
{
    "accuracy": <số từ 0-100>,
    "pronunciation": <số từ 0-100>,
    "fluency": <số từ 0-100>,
    "overallScore": <số từ 0-100>,
    "feedback": "<Nhận xét chi tiết bằng tiếng Việt>",
    "suggestions": ["<gợi ý 1>", "<gợi ý 2>", "<gợi ý 3>"]
}

Chỉ trả về JSON, không có text thừa.`
  }

  /**
   * Build prompt cho gợi ý cá nhân hóa
   */
  private buildRecommendationPrompt(
    analysis: any,
    limit: number,
    lang: string = 'vi'
  ): string {
    const {
      totalExerciseAttempts,
      totalTestAttempts,
      averageScore,
      weakAreas,
      strongAreas
    } = analysis
    const languageInstruction =
      lang === 'en'
        ? 'Write all "reason" and "message" fields in English.'
        : 'Viết tất cả các trường "reason" và "message" bằng tiếng Việt.'

    return `Bạn là trợ lý AI chuyên về giáo dục tiếng Nhật. Dựa trên dữ liệu học tập của học viên, hãy đưa ra ${limit} gợi ý cá nhân hóa.

Thống kê học tập:
- Tổng số bài tập đã làm: ${totalExerciseAttempts}
- Tổng số bài test đã làm: ${totalTestAttempts}
- Điểm trung bình: ${averageScore.toFixed(1)}/100
- Điểm yếu: ${weakAreas.join(', ') || 'Chưa có dữ liệu'}
- Điểm mạnh: ${strongAreas.join(', ') || 'Chưa có dữ liệu'}

Hãy đưa ra gợi ý với các loại:
- exercise: Bài tập cần làm
- test: Bài test cần thử
- lesson: Bài học cần xem lại

${languageInstruction}

Trả về JSON array với format:
[
    {
        "type": "exercise|test|lesson",
        "id": <ID của item>,
        "title": "<Tiêu đề>",
        "description": "<Mô tả ngắn>",
        "reason": "<Lý do tại sao gợi ý này phù hợp>",
        "priority": "high|medium|low"
    }
]

Chỉ trả về JSON array, không có text thừa. Sắp xếp theo priority từ cao xuống thấp.`
  }

  /**
   * Parse response từ Gemini cho đánh giá SPEAKING
   */
  private parseSpeakingEvaluationResponse(text: string): SpeakingEvaluationResponse {
    try {
      // Tìm JSON trong response (có thể có markdown code block)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Không tìm thấy JSON trong response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        accuracy: Math.max(0, Math.min(100, parsed.accuracy || 0)),
        pronunciation: Math.max(0, Math.min(100, parsed.pronunciation || 0)),
        fluency: Math.max(0, Math.min(100, parsed.fluency || 0)),
        overallScore: Math.max(0, Math.min(100, parsed.overallScore || 0)),
        feedback: parsed.feedback || 'Chưa có nhận xét',
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
      }
    } catch (error) {
      this.logger.error('Error parsing speaking evaluation response:', error)
      // Trả về response mặc định nếu parse lỗi
      return {
        accuracy: 50,
        pronunciation: 50,
        fluency: 50,
        overallScore: 50,
        feedback: 'Không thể phân tích chi tiết. Vui lòng thử lại.',
        suggestions: ['Luyện tập phát âm thường xuyên hơn']
      }
    }
  }

  /**
   * Parse và validate recommendations từ Gemini response
   * @param text Text response từ Gemini API
   * @param analysis Dữ liệu analysis
   * @param options Options từ request
   * @returns Danh sách recommendations đã được validate và filter
   */
  private parseAndValidateRecommendations(
    text: string,
    analysis: any,
    options?: { createSrs?: boolean; allowedTypes?: string[]; lang?: string }
  ): any[] {
    // Parse response từ Gemini
    let recommendations = this.parseRecommendationsResponse(text, analysis)

    // Validate và log recommendations
    try {
      const invalid = (recommendations || []).filter(
        (r: any) =>
          !(r?.targetId || r?.contentId) || Number(r.targetId || r.contentId) <= 0
      )
      const valid = (recommendations || []).filter(
        (r: any) => (r?.targetId || r?.contentId) && Number(r.targetId || r.contentId) > 0
      )
      this.logger.log(
        `[RECOMMEND] Parsed items: total=${recommendations?.length || 0}, valid=${valid.length}, invalid=${invalid.length}`
      )
      if (invalid.length > 0) {
        this.logger.warn(
          `[RECOMMEND] Invalid items (contentId<=0): ${JSON.stringify(invalid).slice(0, 500)}`
        )
      }
      for (const it of recommendations || []) {
        try {
          const qb = it.sourceQuestionBankId || it.questionBankId || 0
          const tt = (it.targetType || it.contentType || '').toString()
          const tid = Number(it.targetId || it.contentId) || 0
          this.logger.debug(
            `[RECOMMEND][ITEM] qbId=${qb} -> ${tt}#${tid} reason="${String(it.reason || '').slice(0, 80)}" priority=${it.priority}`
          )
        } catch {}
      }
    } catch {}

    // Filter theo allowedTypes nếu có
    if (options?.allowedTypes && options.allowedTypes.length > 0) {
      const allow = new Set(options.allowedTypes.map((t) => String(t).toUpperCase()))
      recommendations = recommendations.filter((r: any) =>
        allow.has(String(r.contentType || '').toUpperCase())
      )
    }

    return recommendations
  }

  /**
   * Xử lý SRS reviews và lưu recommendations vào DB
   * @param userId ID của user
   * @param payload Payload chứa recommendations
   * @param options Options từ request
   * @param modelName Tên model Gemini đã sử dụng
   */
  private async processSrsAndSaveRecommendations(
    userId: number,
    payload: PersonalizedRecommendationsResponse,
    options?: { createSrs?: boolean; allowedTypes?: string[]; lang?: string },
    modelName?: string
  ): Promise<void> {
    try {
      // SRS types: VOCABULARY, GRAMMAR, KANJI, TEST, EXERCISE
      const validSrsTypes = ['VOCABULARY', 'GRAMMAR', 'KANJI', 'TEST', 'EXERCISE']
      const priorityToLevel: Record<string, number> = {
        high: 2,
        medium: 1,
        low: 0
      }
      const totalRecommendations = payload.recommendations?.length || 0
      const createSrsEnabled = options?.createSrs ?? false
      this.logger.log(
        `[SRS] Total recommendations: ${totalRecommendations}, createSrs: ${createSrsEnabled}`
      )

      const srsRows = (options?.createSrs ? payload.recommendations || [] : [])
        .map((r: any) => {
          const contentType = String(
            r.targetType || r.contentType || 'VOCABULARY'
          ).toUpperCase()
          const contentId = Number(r.targetId || r.contentId) || 0
          const priority = String(r.priority || '').toLowerCase()
          const srsLevel = priorityToLevel[priority] ?? 0

          // Validate contentType và contentId
          if (!contentId || !validSrsTypes.includes(contentType)) {
            if (contentType && !validSrsTypes.includes(contentType)) {
              this.logger.warn(
                `[SRS][SKIP] Invalid contentType: ${contentType} (contentId: ${contentId})`
              )
            } else if (!contentId) {
              this.logger.warn(
                `[SRS][SKIP] Invalid contentId: ${contentId} (contentType: ${contentType})`
              )
            }
            return null
          }

          return {
            userId,
            contentType,
            contentId,
            message: r.message || r.reason || '',
            srsLevel,
            nextReviewDate: new Date(), // Ôn ngay
            incorrectStreak: 0,
            isLeech: false
          }
        })
        .filter(Boolean)

      this.logger.log(
        `[SRS] Valid SRS rows after validation: ${srsRows.length} / ${totalRecommendations}`
      )

      // Xử lý SRS reviews: Tạo hoặc cập nhật các bài ôn tập theo hệ thống Spaced Repetition
      // SRS giúp người dùng ôn lại nội dung đúng thời điểm để ghi nhớ lâu dài
      if (srsRows.length > 0) {
        let createCount = 0
        let updateCount = 0
        const today = this.getHcmTodayString() // Dùng timezone HCM

        // Loại bỏ duplicate trong cùng batch: giữ lại item đầu tiên cho mỗi cặp (contentType, contentId)
        const seen = new Map<string, any>()
        const uniqueSrsRows: any[] = []
        for (const srs of srsRows as any[]) {
          if (!srs) continue
          const key = `${srs.contentType}-${srs.contentId}`
          if (!seen.has(key)) {
            seen.set(key, srs)
            uniqueSrsRows.push(srs)
          } else {
            this.logger.debug(
              `[SRS][SKIP_DUPLICATE] ${srs.contentType}#${srs.contentId} (already processed in this batch)`
            )
          }
        }

        if (uniqueSrsRows.length < srsRows.length) {
          this.logger.log(
            `[SRS] Deduplicated: ${uniqueSrsRows.length} unique items from ${srsRows.length} total`
          )
        }

        // Track các item đã được xử lý trong batch này để tránh query DB nhiều lần
        const processedInBatch = new Map<string, boolean>()

        // Duyệt qua từng SRS review được tạo từ recommendations
        for (const srs of uniqueSrsRows) {
          if (!srs) continue

          const key = `${srs.contentType}-${srs.contentId}`

          // Kiểm tra xem đã được xử lý trong batch này chưa
          if (processedInBatch.has(key)) {
            this.logger.debug(
              `[SRS][SKIP] ${srs.contentType}#${srs.contentId} (already processed in this batch)`
            )
            continue
          }

          // Kiểm tra xem đã tồn tại SRS review cho nội dung này chưa
          // Sử dụng composite key: userId + contentType + contentId
          const existing = await (this.prisma as any).userSrsReview.findUnique({
            where: {
              userId_contentType_contentId: {
                userId: srs.userId,
                contentType: srs.contentType as any,
                contentId: srs.contentId
              }
            }
          })

          // Đánh dấu đã xử lý
          processedInBatch.set(key, true)

          // Trường hợp 1: Chưa có SRS review -> Tạo mới
          if (!existing) {
            // Tạo SRS review mới với trạng thái chưa đọc (isRead: false)
            // Người dùng sẽ cần ôn lại nội dung này
            // Set nextReviewDate = hôm nay 00:00:00 theo timezone HCM (convert về UTC)
            const todayStartUTC = this.getUtcTodayStart()
            const todayStartHcmStr = this.getHcmTodayString()

            await (this.prisma as any).userSrsReview.create({
              data: {
                ...srs,
                isRead: false,
                nextReviewDate: todayStartUTC
              }
            })
            createCount++
            this.logger.log(
              `[SRS][CREATE] ${srs.contentType}#${srs.contentId} nextReviewDate=${todayStartHcmStr} (UTC: ${todayStartUTC.toISOString()}) message="${String(srs.message || '').slice(0, 80)}"`
            )
            continue
          }

          // Trường hợp 2: Đã có SRS review -> Cập nhật thông tin
          // Convert existing.nextReviewDate từ UTC sang HCM để so sánh
          const existingDate = existing.nextReviewDate
            ? new Date(existing.nextReviewDate.getTime() + 7 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0]
            : 'N/A'
          const todayDate = today

          // Kiểm tra xem existing.nextReviewDate có phải là hôm nay không (theo HCM)
          const isExistingToday = existingDate === todayDate

          // Đặt ngày ôn tiếp theo là ngày mai 00:00:00 theo timezone HCM (convert về UTC)
          const tomorrowStartUTC = this.getUtcTomorrowStart()
          const tomorrowDate = new Date(tomorrowStartUTC.getTime() + 7 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]

          // Tính toán incorrectStreak: số lần liên tiếp trả lời sai
          let incorrectStreak = existing.incorrectStreak
          // Nếu chưa đọc (chưa ôn) thì tăng streak lên 1
          if (!existing.isRead) incorrectStreak += 1

          // Đánh dấu "leech" nếu sai quá nhiều lần (>= 5 lần)
          // Leech là những nội dung khó, cần chú ý đặc biệt
          const isLeech = incorrectStreak >= 5

          // Cập nhật SRS review với thông tin mới
          await (this.prisma as any).userSrsReview.update({
            where: {
              userId_contentType_contentId: {
                userId: srs.userId,
                contentType: srs.contentType as any,
                contentId: srs.contentId
              }
            },
            data: {
              nextReviewDate: tomorrowStartUTC, // Ngày ôn tiếp theo (ngày mai theo HCM, UTC)
              incorrectStreak, // Số lần sai liên tiếp
              isLeech, // Có phải leech không
              message: srs.message || undefined // Lý do cần ôn lại
            }
          })
          updateCount++
          this.logger.log(
            `[SRS][UPDATE] ${srs.contentType}#${srs.contentId} nextReviewDate=${tomorrowDate} (was: ${existingDate}${isExistingToday ? ' [TODAY]' : ''}) isRead=${existing.isRead} incorrectStreak=${incorrectStreak} isLeech=${isLeech}`
          )

          // Nếu SRS review đã được đọc (đã ôn) trước đó
          // Tạo AI recommendation để gợi ý người dùng ôn lại
          if (existing.isRead) {
            await (this.prisma as any).userAIRecommendation
              .create({
                data: {
                  userId: srs.userId,
                  targetType: srs.contentType as any,
                  targetId: srs.contentId,
                  reason: srs.message || 'Ôn lại để củng cố',
                  source: 'SRS', // Nguồn từ hệ thống SRS
                  modelUsed: modelName
                }
              })
              .catch(() => {}) // Bỏ qua lỗi nếu đã tồn tại recommendation
            this.logger.log(`[RECOMMEND][FROM_SRS] ${srs.contentType}#${srs.contentId}`)
          }
        }
        // Đếm số SRS với nextReviewDate = hôm nay sau khi xử lý (theo timezone HCM)
        const { start: todayStart, end: todayEnd } = this.getHcmTodayRange()
        const todayCount = await (this.prisma as any).userSrsReview.count({
          where: {
            userId,
            nextReviewDate: {
              gte: todayStart,
              lte: todayEnd
            }
          }
        })

        this.logger.log(
          `[SRS][SUMMARY] Total: ${srsRows.length}, Unique: ${uniqueSrsRows.length}, CREATE: ${createCount} (nextReviewDate=${today}), UPDATE: ${updateCount} (nextReviewDate=tomorrow)`
        )
        this.logger.log(
          `[SRS][SUMMARY] Total SRS with nextReviewDate=${today} for user ${userId}: ${todayCount}`
        )
      }

      // Lưu recommendations vào DB để FE có thể hiển thị lại/ghi nhận hành động
      const recRows = (payload.recommendations || [])
        .map((r: any) => {
          // Nếu có questionBankId hợp lệ, tag Recommendation tới QUESTION_BANK trước
          const qbId = Number(r.sourceQuestionBankId || r.questionBankId) || 0
          if (qbId > 0) {
            const row = {
              userId,
              targetType: 'QUESTION_BANK' as any,
              targetId: qbId,
              reason: String(r.reason || ''),
              source: 'PERSONALIZED',
              modelUsed: modelName
            }
            this.logger.debug(
              `[RECOMMEND][SAVE] QUESTION_BANK#${qbId} reason="${String(r.reason || '').slice(0, 80)}"`
            )
            return row
          }

          // Fallback: Map theo contentType
          const contentTypeUpper = String(
            r.targetType || r.contentType || 'VOCABULARY'
          ).toUpperCase()
          let targetType: RecommendationTargetType = RecommendationTargetType.VOCABULARY
          if (contentTypeUpper === 'VOCABULARY')
            targetType = RecommendationTargetType.VOCABULARY
          else if (contentTypeUpper === 'GRAMMAR')
            targetType = RecommendationTargetType.GRAMMAR
          else if (contentTypeUpper === 'KANJI')
            targetType = RecommendationTargetType.KANJI
          else if (contentTypeUpper === 'EXERCISE')
            targetType = RecommendationTargetType.EXERCISE
          else if (contentTypeUpper === 'TEST') targetType = RecommendationTargetType.TEST
          else if (contentTypeUpper === 'LESSON')
            targetType = RecommendationTargetType.LESSON

          const row = {
            userId,
            targetType,
            targetId: Number(r.targetId || r.contentId) || 0,
            reason: String(r.reason || ''),
            source: 'PERSONALIZED',
            modelUsed: modelName
          }
          this.logger.debug(
            `[RECOMMEND][SAVE] ${String(targetType)}#${row.targetId} reason="${String(r.reason || '').slice(0, 80)}"`
          )
          return row
        })
        .filter((r: any) => r.targetId > 0)

      if (recRows.length > 0) {
        await (this.prisma as any).userAIRecommendation.createMany({
          data: recRows,
          skipDuplicates: true
        })
        this.logger.log(`[RECOMMEND] Saved ${recRows.length} recommendations`)
      }
    } catch (e) {
      this.logger.warn('Failed to persist SRS/recommendations', e as any)
    }
  }

  private parseRecommendationsResponse(text: string, analysis: any): any[] {
    try {
      // Tìm JSON array trong response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('Không tìm thấy JSON array trong response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      if (!Array.isArray(parsed)) {
        throw new Error('Response không phải là array')
      }

      // Parse format mới: có thể kèm questionBankId/target
      return parsed.map((item) => {
        // New prompt schema
        const sourceQuestionBankId =
          Number(item.sourceQuestionBankId || item.questionBankId) || 0
        const targetType = String(
          item.targetType || item.contentType || 'VOCABULARY'
        ).toUpperCase()
        const targetId = Number(item.targetId || item.contentId) || 0
        return {
          sourceQuestionBankId,
          targetType,
          targetId,
          // Backward-compat fields for downstream usage
          contentType: targetType,
          contentId: targetId,
          reason: item.reason || '',
          message: item.message || '',
          priority: item.priority || 'medium'
        }
      })
    } catch (error) {
      this.logger.error('Error parsing recommendations response:', error)
      return []
    }
  }

  /**
   * Phân tích hiệu suất học tập của user
   */
  private analyzeUserPerformance(exerciseAttempts: any[], testAttempts: any[]) {
    // Tính toán điểm trung bình
    let totalScore = 0
    let count = 0

    // Từ exercise attempts
    exerciseAttempts.forEach((attempt) => {
      if (attempt.userAnswerLogs && attempt.userAnswerLogs.length > 0) {
        const correctCount = attempt.userAnswerLogs.filter(
          (log: any) => log.isCorrect
        ).length
        const score = (correctCount / attempt.userAnswerLogs.length) * 100
        totalScore += score
        count++
      }
    })

    // Từ test attempts
    testAttempts.forEach((attempt) => {
      if (attempt.score !== null && attempt.score !== undefined) {
        totalScore += attempt.score
        count++
      }
    })

    const averageScore = count > 0 ? totalScore / count : 0

    // Phân tích điểm yếu và điểm mạnh dựa trên questionType
    const questionTypeStats: { [key: string]: { correct: number; total: number } } = {}

    exerciseAttempts.forEach((attempt) => {
      attempt.userAnswerLogs?.forEach((log: any) => {
        const type = log.questionBank?.questionType || 'UNKNOWN'
        if (!questionTypeStats[type]) {
          questionTypeStats[type] = { correct: 0, total: 0 }
        }
        questionTypeStats[type].total++
        if (log.isCorrect) {
          questionTypeStats[type].correct++
        }
      })
    })

    testAttempts.forEach((attempt) => {
      attempt.userTestAnswerLogs?.forEach((log: any) => {
        const type = log.questionBank?.questionType || 'UNKNOWN'
        if (!questionTypeStats[type]) {
          questionTypeStats[type] = { correct: 0, total: 0 }
        }
        questionTypeStats[type].total++
        if (log.isCorrect) {
          questionTypeStats[type].correct++
        }
      })
    })

    // Xác định điểm yếu (tỷ lệ đúng < 60%) và điểm mạnh (> 80%)
    const weakAreas: string[] = []
    const strongAreas: string[] = []

    Object.entries(questionTypeStats).forEach(([type, stats]) => {
      if (stats.total >= 5) {
        // Chỉ tính nếu có ít nhất 5 câu
        const accuracy = (stats.correct / stats.total) * 100
        if (accuracy < 60) {
          weakAreas.push(type)
        } else if (accuracy > 80) {
          strongAreas.push(type)
        }
      }
    })

    return {
      totalExerciseAttempts: exerciseAttempts.length,
      totalTestAttempts: testAttempts.length,
      averageScore,
      weakAreas,
      strongAreas
    }
  }
}
