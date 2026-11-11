import {
  CreateQuestionBankBodyType,
  CreateQuestionBankWithMeaningsBodyType,
  UpdateQuestionBankWithMeaningsBodyType,
  CreateQuestionBankWithAnswersBodyType,
  GetQuestionBankByIdParamsType,
  GetQuestionBankListQueryType,
  UpdateQuestionBankBodyType
} from '@/modules/question-bank/entities/question-bank.entities'
import {
  InvalidQuestionBankDataException,
  QuestionBankNotFoundException
} from '@/modules/question-bank/dto/question-bank.error'
import { QUESTION_BANK_MESSAGE } from '@/common/constants/message'
import { QuestionBankRepository } from '@/modules/question-bank/question-bank.repo'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import {
  Injectable,
  Logger,
  HttpException,
  ConflictException,
  BadRequestException
} from '@nestjs/common'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { QuestionType } from '@prisma/client'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { UploadService } from '@/3rdService/upload/upload.service'
import { TranslationService } from '@/modules/translation/translation.service'
import { LanguagesService } from '@/modules/languages/languages.service'
import { AnswerService } from '@/modules/answer/answer.service'
import { PrismaService } from '@/shared/services/prisma.service'

// Custom validation functions for Japanese text (allow placeholders and inline Latin)
const isJapaneseText = (text: string): boolean => {
  if (!text || !text.trim()) return false
  // Accept if string contains at least one Japanese char OR placeholder underscores
  const hasJapanese =
    /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF\uF900-\uFAFF\u2F800-\u2FA1F]/.test(
      text
    )
  const hasPlaceholder = /[_\uFF3F]{1,}/.test(text) // '_' or fullwidth '＿'
  return hasJapanese || hasPlaceholder
}

// Custom error messages
const JAPANESE_TEXT_ERROR = 'Nội dung phải chứa tiếng Nhật hoặc chỗ trống (＿＿＿)'

@Injectable()
export class QuestionBankService {
  private readonly logger = new Logger(QuestionBankService.name)

  constructor(
    private readonly questionBankRepository: QuestionBankRepository,
    private readonly textToSpeechService: TextToSpeechService,
    private readonly uploadService: UploadService,
    private readonly translationService: TranslationService,
    private readonly languagesService: LanguagesService,
    private readonly answerService: AnswerService,
    private readonly prismaService: PrismaService
  ) {}

  async createWithMeanings(
    body: CreateQuestionBankWithMeaningsBodyType,
    userId: number,
    skipDuplicateCheck: boolean = false
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(`Creating question bank with meanings: ${JSON.stringify(body)}`)

      // Validate special rules based on questionType
      this.validateQuestionBankData(body)

      // Kiểm tra questionJp đã tồn tại chưa (chỉ khi không skip)
      if (!skipDuplicateCheck) {
        const questionJpExists = await this.questionBankRepository.checkQuestionJpExists(
          body.questionJp
        )
        if (questionJpExists) {
          throw new ConflictException(QUESTION_BANK_MESSAGE.ALREADY_EXISTS)
        }
      }

      // Xử lý audioUrl - tự tạo text-to-speech cho LISTENING và SPEAKING nếu không có audioUrl
      if (
        (body.questionType === QuestionType.LISTENING ||
          body.questionType === QuestionType.SPEAKING) &&
        (!body.audioUrl || body.audioUrl.trim().length === 0)
      ) {
        body.audioUrl = await this.textToSpeechService.generateAudioFromText(
          body.questionJp,
          'question-bank',
          'question_bank'
        )
      }

      // Tự động tạo meaningKey cho từng meaning nếu không có
      if (body.meanings && body.meanings.length > 0) {
        for (const meaning of body.meanings) {
          if (!meaning.meaningKey || meaning.meaningKey.trim().length === 0) {
            // Tạo meaningKey tạm thời, sẽ được cập nhật sau khi có ID
            meaning.meaningKey = `temp.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`
          }
        }
      }

      // Tạo question bank trước (không có questionKey)
      const questionBank = await this.questionBankRepository.createWithMeanings(
        body,
        userId
      )

      // Tự động tạo questionKey dựa trên ID vừa tạo
      if (!body.questionKey || body.questionKey.trim().length === 0) {
        const generatedKey = this.generateQuestionKeyFromId(
          questionBank.id,
          body.questionType
        )
        // Cập nhật questionKey cho question bank vừa tạo
        await this.questionBankRepository.updateQuestionKey(questionBank.id, generatedKey)
        questionBank.questionKey = generatedKey
      }

      // Cập nhật meaningKey với questionKey làm base
      if (body.meanings && body.meanings.length > 0 && questionBank.questionKey) {
        await this.updateMeaningKeys(
          questionBank.id,
          questionBank.questionKey,
          body.meanings
        )
      }

      return {
        statusCode: 201,
        data: questionBank,
        message: QUESTION_BANK_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error creating question bank with meanings:', error)
      if (
        error instanceof HttpException ||
        error.message?.includes('đã tồn tại') ||
        error.message?.includes('không tồn tại')
      ) {
        throw error
      }
      throw InvalidQuestionBankDataException
    }
  }

  private validateQuestionBankData(body: CreateQuestionBankWithMeaningsBodyType): void {
    // Rule 1: questionJp must be valid Japanese text
    if (body.questionJp && !isJapaneseText(body.questionJp)) {
      throw new BadRequestException(JAPANESE_TEXT_ERROR)
    }

    // Rule 2: SPEAKING - pronunciation is required
    if (
      body.questionType === QuestionType.SPEAKING &&
      (!body.pronunciation || body.pronunciation.trim().length === 0)
    ) {
      throw new BadRequestException(
        'SPEAKING type bắt buộc phải có pronunciation (cách phát âm romaji)'
      )
    }

    // Rule 3: audioUrl nếu được cung cấp (không rỗng) phải là URL hợp lệ (mọi loại)
    if (body.audioUrl && body.audioUrl.trim().length > 0) {
      try {
        new URL(body.audioUrl)
      } catch {
        throw new BadRequestException('audioUrl phải là một URL hợp lệ')
      }
    }
  }

  async findAll(
    query: GetQuestionBankListQueryType,
    lang: string = 'vi'
  ): Promise<MessageResDTO> {
    const { data, total } = await this.questionBankRepository.findMany(query)
    const { currentPage, pageSize } = query
    const totalPage = Math.ceil(total / pageSize)

    // Đếm số câu hỏi theo từng levelN
    const levelCounts = await this.questionBankRepository.countByLevelN(query)

    return {
      statusCode: 200,
      data: {
        results: data,
        pagination: {
          current: currentPage,
          pageSize: pageSize,
          totalPage: totalPage,
          totalItem: total
        },
        levelCounts: {
          N5: levelCounts.N5,
          N4: levelCounts.N4,
          N3: levelCounts.N3,
          N2: levelCounts.N2,
          N1: levelCounts.N1
        }
      },
      message: QUESTION_BANK_MESSAGE.GET_LIST_SUCCESS
    }
  }

  async findOne(id: number): Promise<MessageResDTO> {
    const questionBank = await this.questionBankRepository.findById(id)

    if (!questionBank) {
      throw QuestionBankNotFoundException
    }

    return {
      statusCode: 200,
      data: questionBank,
      message: QUESTION_BANK_MESSAGE.GET_SUCCESS
    }
  }

  async findByIds(ids: number[], lang: string = 'vi'): Promise<MessageResDTO> {
    const questionBanks = await this.questionBankRepository.findByIds(ids, lang)

    return {
      statusCode: 200,
      data: {
        results: questionBanks,
        pagination: {
          current: 1,
          pageSize: questionBanks.length,
          totalPage: 1,
          totalItem: questionBanks.length
        }
      },
      message: QUESTION_BANK_MESSAGE.GET_LIST_SUCCESS
    }
  }

  async update(id: number, body: UpdateQuestionBankBodyType): Promise<MessageResDTO> {
    try {
      // Xử lý audioUrl rỗng trước khi validate - chuyển thành null để lưu vào DB
      if (typeof body.audioUrl === 'string' && body.audioUrl.trim().length === 0) {
        body.audioUrl = null
      }

      // Validate theo questionType nếu truyền vào
      if ((body as any).questionType) {
        this.validateQuestionBankData(
          body as unknown as CreateQuestionBankWithMeaningsBodyType
        )
      }

      // LISTENING và SPEAKING: xử lý TTS
      if (
        (body as any).questionType === QuestionType.LISTENING ||
        (body as any).questionType === QuestionType.SPEAKING
      ) {
        // Nếu không gửi audioUrl nhưng có questionJp, tự động tạo TTS
        if (
          (body.audioUrl === undefined || body.audioUrl === null) &&
          (body as any).questionJp
        ) {
          body.audioUrl = await this.textToSpeechService.generateAudioFromText(
            (body as any).questionJp,
            'question-bank',
            'question_bank'
          )
        }
      }

      const questionBank = await this.questionBankRepository.update(id, body)

      // Đảm bảo questionKey sử dụng format mới
      if (
        !questionBank.questionKey ||
        !questionBank.questionKey.startsWith('question.')
      ) {
        const generatedKey = this.generateQuestionKeyFromId(
          questionBank.id,
          questionBank.questionType
        )
        await this.questionBankRepository.updateQuestionKey(questionBank.id, generatedKey)
        questionBank.questionKey = generatedKey
      }

      return {
        statusCode: 200,
        data: questionBank,
        message: QUESTION_BANK_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error updating question bank:', error)
      if (
        error instanceof HttpException ||
        error.message?.includes('không tồn tại') ||
        error.message?.includes('đã tồn tại')
      ) {
        throw error
      }
      throw InvalidQuestionBankDataException
    }
  }

  async updateWithMeanings(
    id: number,
    body: UpdateQuestionBankWithMeaningsBodyType
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(`Updating question bank with meanings: ${JSON.stringify(body)}`)

      // Xử lý audioUrl rỗng trước khi validate - chuyển thành null để lưu vào DB
      if (typeof body.audioUrl === 'string' && body.audioUrl.trim().length === 0) {
        body.audioUrl = null
      }

      // Validate special rules based on questionType (nếu có)
      if (body.questionType) {
        this.validateQuestionBankData(body as CreateQuestionBankWithMeaningsBodyType)
      }

      // Kiểm tra questionJp đã tồn tại chưa (chỉ khi questionJp thay đổi)
      if (body.questionJp) {
        // Lấy question hiện tại để so sánh
        const currentQuestion = await this.questionBankRepository.findById(id)
        if (!currentQuestion) {
          throw QuestionBankNotFoundException
        }

        // Chỉ kiểm tra duplicate nếu questionJp thay đổi
        if (currentQuestion.questionJp !== body.questionJp) {
          this.logger.log(
            `QuestionJp changed from "${currentQuestion.questionJp}" to "${body.questionJp}", checking duplicate...`
          )
          const questionJpExists =
            await this.questionBankRepository.checkQuestionJpExists(body.questionJp, id)
          this.logger.log(`QuestionJp exists result: ${questionJpExists}`)
          if (questionJpExists) {
            throw new ConflictException(QUESTION_BANK_MESSAGE.ALREADY_EXISTS)
          }
        } else {
          this.logger.log(
            `QuestionJp unchanged: "${body.questionJp}", skipping duplicate check`
          )
        }
      }

      // Xử lý audioUrl - tự tạo text-to-speech cho LISTENING và SPEAKING nếu không có audioUrl
      if (
        (body.questionType === QuestionType.LISTENING ||
          body.questionType === QuestionType.SPEAKING) &&
        body.questionJp &&
        (!body.audioUrl || body.audioUrl.trim().length === 0)
      ) {
        body.audioUrl = await this.textToSpeechService.generateAudioFromText(
          body.questionJp,
          'question-bank',
          'question_bank'
        )
      }

      // Tự động tạo meaningKey cho từng meaning nếu không có
      if (body.meanings && body.meanings.length > 0) {
        for (const meaning of body.meanings) {
          if (!meaning.meaningKey || meaning.meaningKey.trim().length === 0) {
            // Tạo meaningKey tạm thời, sẽ được cập nhật sau khi có ID
            meaning.meaningKey = `temp.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`
          }
        }
      }

      // Update question bank
      const questionBank = await this.questionBankRepository.updateWithMeanings(id, body)

      // Đảm bảo questionKey sử dụng format mới
      if (
        !questionBank.questionKey ||
        !questionBank.questionKey.startsWith('question.')
      ) {
        const generatedKey = this.generateQuestionKeyFromId(
          questionBank.id,
          questionBank.questionType
        )
        await this.questionBankRepository.updateQuestionKey(questionBank.id, generatedKey)
        questionBank.questionKey = generatedKey
      }

      // Cập nhật meaningKey với questionKey làm base (nếu có meanings)
      if (body.meanings && body.meanings.length > 0 && questionBank.questionKey) {
        await this.updateMeaningKeys(
          questionBank.id,
          questionBank.questionKey,
          body.meanings
        )
      }

      return {
        statusCode: 200,
        data: questionBank,
        message: QUESTION_BANK_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error updating question bank with meanings:', error)
      if (
        error instanceof HttpException ||
        error.message?.includes('đã tồn tại') ||
        error.message?.includes('không tồn tại')
      ) {
        throw error
      }
      throw InvalidQuestionBankDataException
    }
  }

  async remove(id: number): Promise<MessageResDTO> {
    try {
      const questionBank = await this.questionBankRepository.delete(id)

      return {
        statusCode: 200,
        data: questionBank,
        message: QUESTION_BANK_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error deleting question bank:', error)
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidQuestionBankDataException
    }
  }

  async removeMany(ids: number[]): Promise<MessageResDTO> {
    try {
      this.logger.log(`Deleting multiple question banks: ${JSON.stringify(ids)}`)

      if (!ids || ids.length === 0) {
        throw new BadRequestException('Danh sách ID không được để trống')
      }

      if (ids.length > 100) {
        throw new BadRequestException('Chỉ được xóa tối đa 100 câu hỏi cùng lúc')
      }

      const result = await this.questionBankRepository.deleteMany(ids)

      if (result.deletedCount === 0) {
        throw new BadRequestException('Không tìm thấy câu hỏi nào để xóa')
      }

      return {
        statusCode: 200,
        data: {
          deletedCount: result.deletedCount,
          deletedIds: result.deletedIds,
          requestedCount: ids.length,
          notFoundCount: ids.length - result.deletedCount
        },
        message: `Xóa thành công ${result.deletedCount}/${ids.length} câu hỏi`
      }
    } catch (error) {
      this.logger.error('Error deleting multiple question banks:', error)
      if (error instanceof HttpException) {
        throw error
      }
      throw InvalidQuestionBankDataException
    }
  }

  async getStatistics(): Promise<MessageResDTO> {
    const statistics = await this.questionBankRepository.getStatistics()

    return {
      statusCode: 200,
      data: statistics,
      message: 'Lấy thống kê câu hỏi thành công'
    }
  }

  async findByQuestionType(questionType: QuestionType): Promise<MessageResDTO> {
    const questions = await this.questionBankRepository.findByQuestionType(questionType)

    return {
      statusCode: 200,
      data: questions,
      message: 'Lấy câu hỏi theo loại thành công'
    }
  }

  async findByLevelN(levelN: number): Promise<MessageResDTO> {
    const questions = await this.questionBankRepository.findByLevelN(levelN)

    return {
      statusCode: 200,
      data: questions,
      message: 'Lấy câu hỏi theo cấp độ thành công'
    }
  }

  async findByTestSetId(testSetId: number): Promise<MessageResDTO> {
    try {
      const questionBanks = await this.questionBankRepository.findByTestSetId(testSetId)

      return {
        statusCode: 200,
        data: {
          results: questionBanks
        },
        message: QUESTION_BANK_MESSAGE.GET_LIST_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding question banks by test set ID:', error)
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidQuestionBankDataException
    }
  }

  /**
   * Tự động tạo questionKey theo mẫu: question.{questionType}.{ID}
   */
  private generateQuestionKeyFromId(id: number, questionType: string): string {
    return `question.${questionType}.${id}`
  }

  /**
   * Cập nhật meaningKey với questionKey làm base
   */
  private async updateMeaningKeys(
    questionBankId: number,
    questionKey: string,
    meanings: Array<{ meaningKey?: string | null; translations: Record<string, string> }>
  ): Promise<void> {
    for (let i = 0; i < meanings.length; i++) {
      const meaning = meanings[i]
      // Sử dụng questionKey làm base: question.VOCABULARY.5 -> question.VOCABULARY.5.meaning.1
      const finalMeaningKey = `${questionKey}.meaning.${i + 1}`

      // Xóa translations cũ nếu có (trước khi tạo mới)
      if (meaning.meaningKey) {
        await this.prismaService.translation.deleteMany({
          where: {
            key: meaning.meaningKey
          }
        })
      }

      // Tạo translations mới trực tiếp
      for (const [languageCode, translation] of Object.entries(meaning.translations)) {
        // Tìm languageId từ languageCode
        const language = await this.prismaService.languages.findFirst({
          where: { code: languageCode }
        })

        if (language) {
          await this.prismaService.translation.upsert({
            where: {
              languageId_key: {
                languageId: language.id,
                key: finalMeaningKey
              }
            },
            update: {
              value: translation
            },
            create: {
              languageId: language.id,
              key: finalMeaningKey,
              value: translation
            }
          })
        }
      }

      // Cập nhật meaningKey trong array
      meaning.meaningKey = finalMeaningKey
    }
  }

  /**
   * Tạo câu hỏi với 4 câu trả lời cùng lúc
   */
  async createWithAnswers(
    body: CreateQuestionBankWithAnswersBodyType,
    userId: number
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(`Creating question bank with answers: ${JSON.stringify(body)}`)

      // Validate special rules based on questionType
      this.validateQuestionBankData(body)

      // Validate answers
      this.validateAnswersData(body.answers, body.questionType)

      // Kiểm tra questionJp đã tồn tại chưa
      const questionJpExists = await this.questionBankRepository.checkQuestionJpExists(
        body.questionJp
      )
      if (questionJpExists) {
        throw new ConflictException(QUESTION_BANK_MESSAGE.ALREADY_EXISTS)
      }

      // Xử lý audioUrl - tự tạo text-to-speech cho LISTENING và SPEAKING nếu không có audioUrl
      if (
        (body.questionType === QuestionType.LISTENING ||
          body.questionType === QuestionType.SPEAKING) &&
        (!body.audioUrl || body.audioUrl.trim().length === 0)
      ) {
        body.audioUrl = await this.textToSpeechService.generateAudioFromText(
          body.questionJp,
          'question-bank',
          'question_bank'
        )
      }

      // Tách answers ra khỏi body để tạo question bank
      const { answers, ...questionBankData } = body

      // Tự động tạo meaningKey cho từng meaning nếu không có
      if (questionBankData.meanings && questionBankData.meanings.length > 0) {
        for (const meaning of questionBankData.meanings) {
          if (!meaning.meaningKey || meaning.meaningKey.trim().length === 0) {
            // Tạo meaningKey tạm thời, sẽ được cập nhật sau khi có ID
            meaning.meaningKey = `temp.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`
          }
        }
      }

      // Tạo question bank với meanings (không có answers)
      const questionBank = await this.questionBankRepository.createWithMeanings(
        questionBankData,
        userId
      )

      // Tự động tạo questionKey dựa trên ID vừa tạo
      const generatedKey = this.generateQuestionKeyFromId(
        questionBank.id,
        questionBankData.questionType
      )
      // Cập nhật questionKey cho question bank vừa tạo
      await this.questionBankRepository.updateQuestionKey(questionBank.id, generatedKey)
      questionBank.questionKey = generatedKey

      // Cập nhật meaningKey với questionKey làm base
      if (
        questionBankData.meanings &&
        questionBankData.meanings.length > 0 &&
        questionBank.questionKey
      ) {
        await this.updateMeaningKeys(
          questionBank.id,
          questionBank.questionKey,
          questionBankData.meanings
        )
      }

      // Tạo answers
      const createdAnswers: any[] = []
      const failedAnswers: { answerJp: string; reason: string }[] = []

      for (const answerData of answers) {
        try {
          // Tạo answer
          const answer = await this.answerService.createAnswer({
            questionBankId: questionBank.id,
            answerJp: answerData.answerJp,
            isCorrect: answerData.isCorrect,
            translations: answerData.translations
          })

          createdAnswers.push(answer.data)
        } catch (error: any) {
          this.logger.error(`Error creating answer "${answerData.answerJp}":`, error)
          failedAnswers.push({
            answerJp: answerData.answerJp,
            reason: this.answerService.failureReason(error)
          })
        }
      }

      const total = answers.length
      const success = createdAnswers.length
      const failed = failedAnswers.length

      let statusCode = 201
      let message = `Tạo câu hỏi và ${success}/${total} câu trả lời thành công`

      if (success === 0) {
        statusCode = 400
        message = 'Tạo câu hỏi thành công nhưng không thể tạo câu trả lời nào'
      } else if (failed > 0) {
        statusCode = 207 // Multi-status
        message = `Tạo câu hỏi thành công và ${success}/${total} câu trả lời thành công`
      }

      return {
        statusCode,
        data: {
          questionBank,
          answers: createdAnswers,
          createdCount: success,
          failedCount: failed,
          failedAnswers: failed > 0 ? failedAnswers : undefined
        },
        message
      }
    } catch (error: any) {
      this.logger.error('Error creating question bank with answers:', error)
      if (error instanceof HttpException) {
        throw error
      }
      throw InvalidQuestionBankDataException
    }
  }

  /**
   * Validate answers data
   */
  private validateAnswersData(
    answers: Array<{ answerJp: string; isCorrect: boolean }>,
    questionType: QuestionType
  ): void {
    // Rule 1: Must have at least 1 answer, max 4
    if (!answers || answers.length === 0) {
      throw new BadRequestException('Phải có ít nhất 1 câu trả lời')
    }
    if (answers.length > 4) {
      throw new BadRequestException('Tối đa 4 câu trả lời')
    }

    // Rule 2: MATCHING type - only 1 answer allowed and must be correct
    if (questionType === QuestionType.MATCHING) {
      if (answers.length !== 1) {
        throw new BadRequestException('MATCHING type chỉ cho phép 1 câu trả lời duy nhất')
      }
      if (!answers[0].isCorrect) {
        throw new BadRequestException('MATCHING type bắt buộc phải có isCorrect = true')
      }
    } else {
      // Rule 3: Other types - only 1 answer can be correct
      const correctAnswers = answers.filter((answer) => answer.isCorrect)
      if (correctAnswers.length === 0) {
        throw new BadRequestException('Phải có ít nhất 1 câu trả lời đúng')
      }
      if (correctAnswers.length > 1) {
        throw new BadRequestException('Chỉ được có 1 câu trả lời đúng')
      }
    }

    // Rule 4 removed: allow any string for answerJp
  }
}
