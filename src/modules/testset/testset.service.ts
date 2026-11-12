import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger
} from '@nestjs/common'
import { TestSetRepo } from './testset.repo'
import {
  CreateTestSetBodyType,
  UpdateTestSetBodyType,
  GetTestSetListQueryType,
  GetTestSetByIdParamsType,
  CreateTestSetWithMeaningsBodyType,
  UpdateTestSetWithMeaningsBodyType,
  CreateTestSetWithQuestionBodyType,
  UpsertTestSetWithQuestionBanksBodyType
} from './entities/testset.entity'
import {
  TestSetNotFoundException,
  TestSetAlreadyExistsException,
  TestSetCannotChangeTestTypeException
} from './dto/testset.error'
import { PrismaService } from '@/shared/services/prisma.service'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { TEST_SET_MESSAGE } from '@/common/constants/message'
import { TranslationService } from '../translation/translation.service'
import { LanguagesService } from '../languages/languages.service'
import { QuestionBankService } from '../question-bank/question-bank.service'
import { CreateQuestionBankWithMeaningsBodyType } from '../question-bank/entities/question-bank.entities'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { QuestionType } from '@prisma/client'

@Injectable()
export class TestSetService {
  private readonly logger = new Logger(TestSetService.name)

  constructor(
    private readonly testSetRepo: TestSetRepo,
    private readonly prisma: PrismaService,
    private readonly translationService: TranslationService,
    private readonly languagesService: LanguagesService,
    private readonly questionBankService: QuestionBankService,
    private readonly textToSpeechService: TextToSpeechService
  ) {}

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  // Kiểm tra chuỗi có chứa ký tự tiếng Nhật (Hiragana, Katakana, Kanji)
  private isJapaneseText(text: string | null | undefined): boolean {
    if (!text) return false
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/
    return japaneseRegex.test(text)
  }

  private validateTestSetData(
    data: CreateTestSetBodyType | UpdateTestSetBodyType,
    isUpdate: boolean = false
  ): void {
    // Validation cho translations
    if (data.translations) {
      if (data.translations.length === 0) {
        throw new BadRequestException('Phải có ít nhất 1 translation')
      }

      // Kiểm tra có ít nhất 1 translation cho name
      const hasNameTranslation = data.translations.some((t) => t.field === 'name')
      if (!hasNameTranslation) {
        throw new BadRequestException('Phải có ít nhất 1 translation cho name')
      }
    }

    if (data.testType !== undefined) {
      if (!data.testType) {
        throw new BadRequestException('Loại đề thi không được để trống')
      }
    }

    if (data.audioUrl !== undefined && data.audioUrl && !this.isValidUrl(data.audioUrl)) {
      throw new BadRequestException('URL âm thanh không hợp lệ')
    }

    if (data.price !== undefined && data.price !== null && data.price < 0) {
      throw new BadRequestException('Giá bộ đề không được âm')
    }

    if (
      data.levelN !== undefined &&
      data.levelN !== null &&
      (data.levelN < 0 || data.levelN > 5)
    ) {
      throw new BadRequestException('Cấp độ JLPT phải từ 0 đến 5 (0 = nhiều cấp độ)')
    }

    // Validation chỉ cho create (không phải update)
    if (!isUpdate) {
      const createData = data as CreateTestSetBodyType
      // Chỉ validate name nếu có field name (không phải upsert schema)
      if (
        'name' in createData &&
        (!createData.name || createData.name.trim().length === 0)
      ) {
        throw new BadRequestException('Tên bộ đề không được để trống')
      }
      if (!createData.testType) {
        throw new BadRequestException('Loại đề thi không được để trống')
      }
    }
  }

  async createTestSet(
    data: CreateTestSetBodyType,
    userId: number
  ): Promise<MessageResDTO> {
    try {
      // Validation
      this.validateTestSetData(data, false)

      // Tạo testset với transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Tạo testset tạm thời để lấy ID
        const testSet = await tx.testSet.create({
          data: {
            name: 'temp', // Tạm thời
            description: 'temp', // Tạm thời
            content: data.content,
            audioUrl: data.audioUrl,
            price: data.price,
            levelN: data.levelN,
            testType: data.testType,
            status: data.status,
            creatorId: userId
          }
        })

        // Tạo keys
        const nameKey = `testset.${testSet.id}.name`
        const descriptionKey = `testset.${testSet.id}.description`

        // Cập nhật testset với keys
        const updatedTestSet = await tx.testSet.update({
          where: { id: testSet.id },
          data: {
            name: nameKey,
            description: descriptionKey
          }
        })

        // Tạo translations
        for (const translation of data.translations) {
          const language = await this.languagesService.findByCode({
            code: translation.language_code
          })
          if (language?.data) {
            const key = translation.field === 'name' ? nameKey : descriptionKey
            await tx.translation.upsert({
              where: {
                languageId_key: {
                  key: key,
                  languageId: language.data.id
                }
              },
              update: { value: translation.value },
              create: {
                key: key,
                languageId: language.data.id,
                value: translation.value
              }
            })
          }
        }

        return updatedTestSet
      })

      return {
        statusCode: 201,
        data: result,
        message: TEST_SET_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error
      }
      this.logger.error('Error creating testset:', error)
      throw new BadRequestException('Không thể tạo bộ đề')
    }
  }

  async getTestSetById(id: number): Promise<MessageResDTO> {
    const testSet = await this.testSetRepo.findById(id)

    if (!testSet) {
      throw TestSetNotFoundException
    }

    return {
      statusCode: 200,
      data: testSet,
      message: TEST_SET_MESSAGE.GET_SUCCESS
    }
  }

  async getTestSets(query: GetTestSetListQueryType): Promise<MessageResDTO> {
    const { data, total } = await this.testSetRepo.findMany(query)
    const { currentPage, pageSize } = query
    const totalPage = Math.ceil(total / pageSize)

    return {
      statusCode: 200,
      data: {
        results: data,
        pagination: {
          current: currentPage,
          pageSize,
          totalPage,
          totalItem: total
        }
      },
      message: TEST_SET_MESSAGE.GET_LIST_SUCCESS
    }
  }

  async findAll(query: GetTestSetListQueryType, lang: string) {
    try {
      const { data, total } = await this.testSetRepo.findMany(query)
      const { currentPage, pageSize } = query
      const totalPage = Math.ceil(total / pageSize)

      return {
        statusCode: 200,
        data: {
          results: data,
          pagination: {
            current: currentPage,
            pageSize,
            totalPage,
            totalItem: total
          }
        },
        message: TEST_SET_MESSAGE.GET_LIST_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding test sets:', error)
      throw new BadRequestException('Không thể lấy danh sách bộ đề')
    }
  }

  async findAllBasic(query: GetTestSetListQueryType, lang: string) {
    try {
      const { data, total } = await this.testSetRepo.findManyBasic(query)
      const { currentPage, pageSize } = query
      const totalPage = Math.ceil(total / pageSize)

      return {
        statusCode: 200,
        data: {
          results: data,
          pagination: {
            current: currentPage,
            pageSize,
            totalPage,
            totalItem: total
          }
        },
        message: TEST_SET_MESSAGE.GET_LIST_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding test sets:', error)
      throw new BadRequestException('Không thể lấy danh sách bộ đề')
    }
  }

  async findOne(id: number, lang: string) {
    try {
      const testSet = await this.testSetRepo.findById(id, lang)

      if (!testSet) {
        throw TestSetNotFoundException
      }

      return {
        statusCode: 200,
        data: testSet,
        message: TEST_SET_MESSAGE.GET_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding test set by id:', error)
      if (error instanceof TestSetNotFoundException) {
        throw error
      }
      throw new BadRequestException('Không thể lấy thông tin bộ đề')
    }
  }

  async updateTestSet(
    id: number,
    data: UpdateTestSetBodyType,
    userId: number
  ): Promise<MessageResDTO> {
    const testSet = await this.testSetRepo.findById(id)

    if (!testSet) {
      throw TestSetNotFoundException
    }

    // Validation
    this.validateTestSetData(data, true)

    // Validate levelN change nếu có update levelN
    if (data.levelN !== undefined && data.levelN !== testSet.levelN) {
      // Kiểm tra xem testSet có câu hỏi không
      const questionCount = await this.prisma.testSetQuestionBank.count({
        where: { testSetId: id }
      })

      // Nếu có câu hỏi và testType KHÔNG phải GENERAL, không cho phép đổi levelN
      // Trừ khi đổi SANG levelN = 0 (nhiều cấp độ) hoặc ĐANG Ở levelN = 0
      if (questionCount > 0 && testSet.testType !== 'GENERAL') {
        // Cho phép nếu:
        // 1. Đổi SANG levelN = 0 (tức là muốn chuyển sang nhiều cấp độ)
        // 2. Đang Ở levelN = 0 (tức là đã ở nhiều cấp độ, có thể đổi)
        if (data.levelN !== 0 && testSet.levelN !== 0) {
          throw new BadRequestException(
            TEST_SET_MESSAGE.CANNOT_CHANGE_LEVELN_HAS_QUESTIONS
          )
        }
      }
    }

    // Validate testType change nếu có update testType
    if (data.testType && data.testType !== testSet.testType) {
      // Lấy danh sách question types hiện có trong testSet
      const testSetQuestionBanks = await this.prisma.testSetQuestionBank.findMany({
        where: { testSetId: id },
        include: {
          questionBank: {
            select: {
              questionType: true
            }
          }
        }
      })

      // Lấy danh sách các question types duy nhất
      const existingQuestionTypes = new Set(
        testSetQuestionBanks.map((tsqb) => tsqb.questionBank.questionType)
      )

      // Nếu testSet đang có questions
      if (existingQuestionTypes.size > 0) {
        const currentTestType = testSet.testType
        const newTestType = data.testType

        // Trường hợp 1: TestSet hiện tại là GENERAL và có nhiều loại question types
        // → Không cho phép update thành type khác
        if (currentTestType === 'GENERAL' && existingQuestionTypes.size > 1) {
          throw new TestSetCannotChangeTestTypeException(
            TEST_SET_MESSAGE.CANNOT_CHANGE_TEST_TYPE_GENERAL_MULTIPLE
          )
        }

        // Trường hợp 2: TestSet hiện tại có questionType cụ thể (VOCABULARY, GRAMMAR, KANJI, etc.)
        // → Chỉ cho phép update thành cùng type hoặc GENERAL
        if (currentTestType !== 'GENERAL') {
          if (newTestType !== currentTestType && newTestType !== 'GENERAL') {
            throw new TestSetCannotChangeTestTypeException(
              `${TEST_SET_MESSAGE.CANNOT_CHANGE_TEST_TYPE_SPECIFIC} (từ ${currentTestType} sang ${newTestType})`
            )
          }
        }

        // Trường hợp 3: Update từ GENERAL (chỉ có 1 loại question) sang type cụ thể
        // → Chỉ cho phép nếu type mới khớp với question type hiện có
        if (currentTestType === 'GENERAL' && newTestType !== 'GENERAL') {
          const singleQuestionType = Array.from(existingQuestionTypes)[0]
          if (newTestType !== singleQuestionType) {
            throw new TestSetCannotChangeTestTypeException(
              `${TEST_SET_MESSAGE.CANNOT_CHANGE_TEST_TYPE_GENERAL_SINGLE} ${singleQuestionType}`
            )
          }
        }
      }
    }

    // Cập nhật testset với transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Cập nhật testset
      const updatedTestSet = await tx.testSet.update({
        where: { id },
        data: {
          content: data.content,
          audioUrl: data.audioUrl,
          price: data.price,
          levelN: data.levelN,
          testType: data.testType,
          status: data.status
        }
      })

      // Cập nhật translations nếu có
      if (data.translations) {
        const nameKey = `testset.${id}.name`
        const descriptionKey = `testset.${id}.description`

        // Cập nhật translations
        for (const translation of data.translations) {
          const language = await this.languagesService.findByCode({
            code: translation.language_code
          })
          if (language?.data) {
            const key = translation.field === 'name' ? nameKey : descriptionKey
            await tx.translation.upsert({
              where: {
                languageId_key: {
                  key: key,
                  languageId: language.data.id
                }
              },
              update: { value: translation.value },
              create: {
                key: key,
                languageId: language.data.id,
                value: translation.value
              }
            })
          }
        }
      }

      return updatedTestSet
    })

    return {
      statusCode: 200,
      data: result,
      message: TEST_SET_MESSAGE.UPDATE_SUCCESS
    }
  }

  async deleteTestSet(id: number, userId: number): Promise<MessageResDTO> {
    const testSet = await this.testSetRepo.findById(id)

    if (!testSet) {
      throw TestSetNotFoundException
    }

    await this.testSetRepo.delete(id)

    return {
      statusCode: 200,
      data: testSet,
      message: TEST_SET_MESSAGE.DELETE_SUCCESS
    }
  }

  private validateTestSetWithMeaningsData(
    data:
      | CreateTestSetWithMeaningsBodyType
      | UpdateTestSetWithMeaningsBodyType
      | UpsertTestSetWithQuestionBanksBodyType,
    isUpdate: boolean = false
  ): void {
    // Validation cho meanings
    if (data.meanings) {
      if (data.meanings.length === 0) {
        throw new BadRequestException('Phải có ít nhất 1 meaning')
      }

      // Kiểm tra có ít nhất 1 meaning cho name
      const hasNameMeaning = data.meanings.some((m) => m.field === 'name')
      if (!hasNameMeaning) {
        throw new BadRequestException('Phải có ít nhất 1 meaning cho name')
      }
    }

    if (data.testType !== undefined) {
      if (!data.testType) {
        throw new BadRequestException('Loại đề thi không được để trống')
      }
    }

    if (data.audioUrl !== undefined && data.audioUrl && !this.isValidUrl(data.audioUrl)) {
      throw new BadRequestException('URL âm thanh không hợp lệ')
    }

    if (data.price !== undefined && data.price !== null && data.price < 0) {
      throw new BadRequestException('Giá bộ đề không được âm')
    }

    if (
      data.levelN !== undefined &&
      data.levelN !== null &&
      (data.levelN < 0 || data.levelN > 5)
    ) {
      throw new BadRequestException('Cấp độ JLPT phải từ 0 đến 5 (0 = nhiều cấp độ)')
    }

    // Validation chỉ cho create (không phải update)
    if (!isUpdate) {
      const createData = data as CreateTestSetWithMeaningsBodyType
      if (!createData.testType) {
        throw new BadRequestException('Loại đề thi không được để trống')
      }
    }
  }

  async createTestSetWithMeanings(
    data: CreateTestSetWithMeaningsBodyType,
    userId: number
  ): Promise<MessageResDTO> {
    try {
      // Validation
      this.validateTestSetWithMeaningsData(data, false)

      // Tạo testset với meanings
      const result = await this.testSetRepo.createWithMeanings(data, userId)

      return {
        statusCode: 201,
        data: result,
        message: TEST_SET_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error
      }
      this.logger.error('Error creating testset with meanings:', error)
      throw new BadRequestException('Không thể tạo bộ đề với meanings')
    }
  }

  async updateTestSetWithMeanings(
    id: number,
    data: UpdateTestSetWithMeaningsBodyType,
    userId: number
  ): Promise<MessageResDTO> {
    const testSet = await this.testSetRepo.findById(id)

    if (!testSet) {
      throw TestSetNotFoundException
    }

    // Validation
    this.validateTestSetWithMeaningsData(data, true)

    // Validate levelN change nếu có update levelN
    if (data.levelN !== undefined && data.levelN !== testSet.levelN) {
      // Kiểm tra xem testSet có câu hỏi không
      const questionCount = await this.prisma.testSetQuestionBank.count({
        where: { testSetId: id }
      })

      // Nếu có câu hỏi và testType KHÔNG phải GENERAL, không cho phép đổi levelN
      // Trừ khi đổi SANG levelN = 0 (nhiều cấp độ) hoặc ĐANG Ở levelN = 0
      if (questionCount > 0 && testSet.testType !== 'GENERAL') {
        // Cho phép nếu:
        // 1. Đổi SANG levelN = 0 (tức là muốn chuyển sang nhiều cấp độ)
        // 2. Đang Ở levelN = 0 (tức là đã ở nhiều cấp độ, có thể đổi)
        if (data.levelN !== 0 && testSet.levelN !== 0) {
          throw new BadRequestException(
            TEST_SET_MESSAGE.CANNOT_CHANGE_LEVELN_HAS_QUESTIONS
          )
        }
      }
    }

    // Validate testType change nếu có update testType
    if (data.testType && data.testType !== testSet.testType) {
      // Lấy danh sách question types hiện có trong testSet
      const testSetQuestionBanks = await this.prisma.testSetQuestionBank.findMany({
        where: { testSetId: id },
        include: {
          questionBank: {
            select: {
              questionType: true
            }
          }
        }
      })

      // Lấy danh sách các question types duy nhất
      const existingQuestionTypes = new Set(
        testSetQuestionBanks.map((tsqb) => tsqb.questionBank.questionType)
      )

      // Nếu testSet đang có questions
      if (existingQuestionTypes.size > 0) {
        const currentTestType = testSet.testType
        const newTestType = data.testType

        // Trường hợp 1: TestSet hiện tại là GENERAL và có nhiều loại question types
        // → Không cho phép update thành type khác
        if (currentTestType === 'GENERAL' && existingQuestionTypes.size > 1) {
          throw new TestSetCannotChangeTestTypeException(
            TEST_SET_MESSAGE.CANNOT_CHANGE_TEST_TYPE_GENERAL_MULTIPLE
          )
        }

        // Trường hợp 2: TestSet hiện tại có questionType cụ thể (VOCABULARY, GRAMMAR, KANJI, etc.)
        // → Chỉ cho phép update thành cùng type hoặc GENERAL
        if (currentTestType !== 'GENERAL') {
          if (newTestType !== currentTestType && newTestType !== 'GENERAL') {
            throw new TestSetCannotChangeTestTypeException(
              `${TEST_SET_MESSAGE.CANNOT_CHANGE_TEST_TYPE_SPECIFIC} (từ ${currentTestType} sang ${newTestType})`
            )
          }
        }

        // Trường hợp 3: Update từ GENERAL (chỉ có 1 loại question) sang type cụ thể
        // → Chỉ cho phép nếu type mới khớp với question type hiện có
        if (currentTestType === 'GENERAL' && newTestType !== 'GENERAL') {
          const singleQuestionType = Array.from(existingQuestionTypes)[0]
          if (newTestType !== singleQuestionType) {
            throw new TestSetCannotChangeTestTypeException(
              `${TEST_SET_MESSAGE.CANNOT_CHANGE_TEST_TYPE_GENERAL_SINGLE} ${singleQuestionType}`
            )
          }
        }
      }
    }

    // Cập nhật testset với meanings
    const result = await this.testSetRepo.updateWithMeanings(id, data)

    return {
      statusCode: 200,
      data: result,
      message: TEST_SET_MESSAGE.UPDATE_SUCCESS
    }
  }

  // Upsert: Tạo mới nếu không có id, cập nhật nếu có id
  async upsertTestSetWithQuestionBanks(
    data: UpsertTestSetWithQuestionBanksBodyType,
    userId: number
  ): Promise<MessageResDTO> {
    const id = data.id
    const isUpdate = id !== null && id !== undefined

    if (isUpdate && id) {
      const existingTestSet = await this.testSetRepo.findById(id)
      if (!existingTestSet) {
        throw TestSetNotFoundException
      }
    }

    try {
      // Validation
      if (isUpdate) {
        this.validateTestSetWithMeaningsData(data, true)
      } else {
        // Khi tạo mới, validate bắt buộc
        if (!data.testType) {
          throw new BadRequestException('testType là bắt buộc khi tạo mới')
        }
        if (!data.meanings || data.meanings.length === 0) {
          throw new BadRequestException('meanings là bắt buộc khi tạo mới')
        }
        this.validateTestSetWithMeaningsData(data, false)

        // Khi tạo mới, phải có ít nhất questionBanks
        if (!data.questionBanks || data.questionBanks.length === 0) {
          throw new BadRequestException('Phải có ít nhất 1 questionBank khi tạo mới')
        }
      }

      // Validate questionBanks nếu có
      if (data.questionBanks && data.questionBanks.length > 0) {
        // Kiểm tra không có trùng lặp id (nếu có)
        const ids = data.questionBanks
          .filter((qb) => 'id' in qb && qb.id)
          .map((qb) => qb.id!)
        const uniqueIds = new Set(ids)
        if (uniqueIds.size !== ids.length) {
          throw new BadRequestException(
            'Danh sách questionBanks có trùng lặp id (TestSetQuestionBank.id)'
          )
        }

        // Pre-validate: questionJp phải là tiếng Nhật (nếu có) trước khi thực hiện bất cứ thao tác IO/DB nào
        for (const qb of data.questionBanks) {
          if (qb.questionJp && !this.isJapaneseText(qb.questionJp)) {
            throw new BadRequestException(
              'questionJp phải là tiếng Nhật (Hiragana/Katakana/Kanji)'
            )
          }
        }
      }

      // Tạo questionBank mới trước (nếu có) - ngoài transaction
      // Phân loại: có id = questionBank đã có (chỉ update order), không có id = tạo mới
      const newQuestionBankIds: number[] = []
      const questionBankMap = new Map<number, number>() // Map: TestSetQuestionBank.id -> QuestionBank.id

      if (data.questionBanks && data.questionBanks.length > 0) {
        // Lấy tất cả TestSetQuestionBank hiện có để map (chỉ khi update)
        const existingTestSetQuestionBanks =
          isUpdate && id
            ? await this.prisma.testSetQuestionBank.findMany({
                where: { testSetId: id },
                select: { id: true, questionBankId: true }
              })
            : []
        const testSetQuestionBankMap = new Map(
          existingTestSetQuestionBanks.map((item) => [item.id, item.questionBankId])
        )

        for (const questionBankData of data.questionBanks) {
          // Nếu có id trong questionBankData, đây là TestSetQuestionBank.id (để update order và meanings)
          if ('id' in questionBankData && questionBankData.id) {
            // Tìm questionBankId từ TestSetQuestionBank.id
            const questionBankId = testSetQuestionBankMap.get(questionBankData.id)
            if (questionBankId) {
              questionBankMap.set(questionBankData.id, questionBankId)

              // Nếu có meanings, sẽ upsert translations trong transaction
              // Lưu vào questionBankMap để xử lý sau
            }
          } else {
            // Không có id = tạo questionBank mới
            // Xử lý audioUrl: chuyển empty string thành null/undefined để logic text-to-speech trong createWithMeanings hoạt động
            let audioUrl = questionBankData.audioUrl
            if (
              audioUrl &&
              typeof audioUrl === 'string' &&
              audioUrl.trim().length === 0
            ) {
              audioUrl = null
            } else if (!audioUrl) {
              audioUrl = null
            }

            // Validate: questionJp phải là tiếng Nhật nếu được cung cấp
            if (
              questionBankData.questionJp &&
              !this.isJapaneseText(questionBankData.questionJp)
            ) {
              throw new BadRequestException(
                'questionJp phải là tiếng Nhật (Hiragana/Katakana/Kanji)'
              )
            }

            const createQuestionBankData: CreateQuestionBankWithMeaningsBodyType = {
              questionJp: questionBankData.questionJp!,
              questionType: questionBankData.questionType,
              audioUrl: audioUrl,
              pronunciation: questionBankData.pronunciation || null,
              role: questionBankData.role || null,
              levelN: questionBankData.levelN || null,
              meanings: questionBankData.meanings || [],
              questionKey: null
            }

            // Logic text-to-speech đã được xử lý trong questionBankService.createWithMeanings()
            // Nếu questionType là LISTENING hoặc SPEAKING và audioUrl null/undefined/empty, sẽ tự động tạo TTS
            // Chỉ skip duplicate check cho SPEAKING (cho phép tạo questionBank trùng questionJp)
            // Các questionType khác vẫn validate trùng
            const skipDuplicateCheck =
              questionBankData.questionType === QuestionType.SPEAKING
            const questionBankResult = await this.questionBankService.createWithMeanings(
              createQuestionBankData,
              userId,
              skipDuplicateCheck
            )

            if (
              questionBankResult.data &&
              typeof questionBankResult.data === 'object' &&
              'id' in questionBankResult.data
            ) {
              newQuestionBankIds.push((questionBankResult.data as any).id)
            }
          }
        }
      }

      // Precompute audio regeneration (outside transaction) to avoid long IO inside tx
      const preExistingTSQB =
        isUpdate && id
          ? await this.prisma.testSetQuestionBank.findMany({
              where: { testSetId: id },
              select: { id: true, questionBankId: true }
            })
          : []
      const preTSQBMap = new Map(
        preExistingTSQB.map((item) => [item.id, item.questionBankId])
      )
      const preGeneratedAudioByQbId = new Map<number, string | null>()

      if (data.questionBanks && data.questionBanks.length > 0) {
        for (const qbData of data.questionBanks) {
          // Determine target QuestionBank ID for updates
          let targetQbId: number | null = null
          if ('id' in qbData && qbData.id) {
            targetQbId = preTSQBMap.get(qbData.id) ?? qbData.id
          }
          // Only regenerate for existing QuestionBanks updated inline
          const shouldRegenerate =
            !!qbData.questionJp &&
            (qbData.questionType === 'SPEAKING' || qbData.questionType === 'LISTENING') &&
            targetQbId !== null
          if (shouldRegenerate) {
            const url = await this.textToSpeechService.generateAudioFromText(
              qbData.questionJp!,
              'question-bank',
              'question_bank'
            )
            preGeneratedAudioByQbId.set(targetQbId!, url)
          }
        }
      }

      // Upsert testset với transaction
      const result = await this.prisma.$transaction(async (tx) => {
        let testSet

        if (isUpdate && id) {
          // Update testset
          testSet = await tx.testSet.update({
            where: { id: id },
            data: {
              content: data.content,
              audioUrl: data.audioUrl,
              price: data.price,
              levelN: data.levelN,
              testType: data.testType,
              status: data.status
            }
          })
        } else {
          // Create testset
          testSet = await tx.testSet.create({
            data: {
              name: 'temp',
              description: 'temp',
              content: data.content,
              audioUrl: data.audioUrl,
              price: data.price,
              levelN: data.levelN,
              testType: data.testType,
              status: data.status,
              creatorId: userId
            }
          })

          // Tạo keys và cập nhật
          const nameKey = `testset.${testSet.id}.name`
          const descriptionKey = `testset.${testSet.id}.description`

          testSet = await tx.testSet.update({
            where: { id: testSet.id },
            data: {
              name: nameKey,
              description: descriptionKey
            }
          })
        }

        const testSetId = testSet.id
        const nameKey = `testset.${testSetId}.name`
        const descriptionKey = `testset.${testSetId}.description`

        // Cập nhật meanings nếu có
        if (data.meanings && data.meanings.length > 0) {
          for (let i = 0; i < data.meanings.length; i++) {
            const meaning = data.meanings[i]
            const baseKey = meaning.field === 'name' ? nameKey : descriptionKey
            const finalKey = `${baseKey}.meaning.${i + 1}`

            // Tạo translations cho từng ngôn ngữ
            for (const [languageCode, translation] of Object.entries(
              meaning.translations
            )) {
              const language = await this.languagesService.findByCode({
                code: languageCode
              })
              if (language?.data) {
                await tx.translation.upsert({
                  where: {
                    languageId_key: {
                      languageId: language.data.id,
                      key: finalKey
                    }
                  },
                  update: { value: translation },
                  create: {
                    languageId: language.data.id,
                    key: finalKey,
                    value: translation
                  }
                })
              }
            }
          }
        }

        // Xử lý questionBanks - order tự động dựa vào vị trí trong mảng
        if (data.questionBanks && data.questionBanks.length > 0) {
          // Lấy tất cả TestSetQuestionBank hiện có
          const existingItems = await tx.testSetQuestionBank.findMany({
            where: { testSetId: testSetId },
            select: { id: true, questionBankId: true }
          })
          const testSetQuestionBankMap = new Map(
            existingItems.map((item) => [item.id, item.questionBankId])
          )
          const existingTestSetQuestionBankIds = new Set(
            existingItems.map((item) => item.id)
          )

          // Phân loại: có id = đã có (update order), không có id = tạo mới
          const itemsToUpdate: Array<{
            testSetQuestionBankId: number
            questionBankId: number
            order: number
          }> = []
          let newQuestionBankIndex = 0

          for (let i = 0; i < data.questionBanks.length; i++) {
            const questionBankData = data.questionBanks[i]
            const order = i + 1

            // Nếu có id = TestSetQuestionBank đã có, update order và meanings (nếu có)
            if ('id' in questionBankData && questionBankData.id) {
              const incomingId = questionBankData.id

              // Nếu id KHỚP TSQB hiện có → xử lý như cũ
              if (existingTestSetQuestionBankIds.has(incomingId)) {
                const testSetQuestionBankId = incomingId
                const questionBankId = testSetQuestionBankMap.get(testSetQuestionBankId)
                if (questionBankId) {
                  // Lấy questionBank info để update
                  const questionBank = await tx.questionBank.findUnique({
                    where: { id: questionBankId },
                    select: { questionKey: true, questionType: true }
                  })

                  if (!questionBank) {
                    throw new BadRequestException(
                      `QuestionBank với ID ${questionBankId} không tồn tại`
                    )
                  }

                  // Update questionBank info nếu có
                  // Validate: questionJp phải là tiếng Nhật nếu có
                  if (
                    questionBankData.questionJp &&
                    !this.isJapaneseText(questionBankData.questionJp)
                  ) {
                    throw new BadRequestException(
                      'questionJp phải là tiếng Nhật (Hiragana/Katakana/Kanji)'
                    )
                  }

                  if (
                    questionBankData.questionJp ||
                    questionBankData.pronunciation ||
                    questionBankData.audioUrl !== undefined ||
                    questionBankData.role !== undefined ||
                    questionBankData.levelN !== undefined
                  ) {
                    const preAudio = preGeneratedAudioByQbId.get(questionBankId)
                    await tx.questionBank.update({
                      where: { id: questionBankId },
                      data: {
                        questionJp: questionBankData.questionJp || undefined,
                        pronunciation:
                          questionBankData.pronunciation !== undefined
                            ? questionBankData.pronunciation
                            : undefined,
                        audioUrl:
                          preAudio !== undefined
                            ? preAudio
                            : questionBankData.audioUrl !== undefined
                              ? questionBankData.audioUrl
                              : undefined,
                        role:
                          questionBankData.role !== undefined
                            ? questionBankData.role
                            : undefined,
                        levelN:
                          questionBankData.levelN !== undefined
                            ? questionBankData.levelN
                            : undefined
                      }
                    })
                  }

                  // Upsert meanings/translations nếu có
                  if (questionBankData.meanings && questionBankData.meanings.length > 0) {
                    // Lấy questionKey của questionBank này (đảm bảo chỉ update translations của questionBank này)
                    const questionKey =
                      questionBank.questionKey ||
                      `question.${questionBank.questionType}.${questionBankId}`

                    // Lấy tất cả meaningKeys hiện có của questionBank này (tự động, không cần FE truyền)
                    const existingMeaningKeys = await tx.translation.findMany({
                      where: {
                        key: { startsWith: questionKey + '.meaning.' }
                      },
                      select: { key: true },
                      distinct: ['key'],
                      orderBy: { key: 'asc' }
                    })

                    // Tạo map: meaningKey -> index (để match với thứ tự trong request)
                    const existingKeysArray = existingMeaningKeys.map((t) => t.key).sort()

                    for (let i = 0; i < questionBankData.meanings.length; i++) {
                      const meaning = questionBankData.meanings[i]

                      // Tự động lấy meaningKey: ưu tiên dùng meaningKey đã có của questionBank này theo thứ tự
                      // Nếu không đủ → tạo mới
                      let meaningKey: string
                      if (i < existingKeysArray.length) {
                        // Dùng meaningKey đã có của questionBank này
                        meaningKey = existingKeysArray[i]
                      } else {
                        // Tạo mới meaningKey nếu chưa đủ
                        meaningKey = `${questionKey}.meaning.${i + 1}`
                      }

                      // Upsert translations cho từng ngôn ngữ
                      for (const [languageCode, translationValue] of Object.entries(
                        meaning.translations
                      )) {
                        const language = await this.languagesService.findByCode({
                          code: languageCode
                        })

                        if (language?.data) {
                          // Upsert: nếu đã có translation với cùng languageId và key (của questionBank này) → update
                          // Nếu chưa có → create
                          await tx.translation.upsert({
                            where: {
                              languageId_key: {
                                languageId: language.data.id,
                                key: meaningKey
                              }
                            },
                            update: {
                              value: translationValue
                            },
                            create: {
                              languageId: language.data.id,
                              key: meaningKey,
                              value: translationValue
                            }
                          })
                        }
                      }
                    }
                  }

                  itemsToUpdate.push({
                    testSetQuestionBankId,
                    questionBankId,
                    order
                  })
                }
              } else {
                // id KHÔNG khớp TSQB hiện có → coi như QuestionBank.id để thêm mới vào TestSet
                const qbId = incomingId

                // Nếu client vẫn gửi thêm dữ liệu meanings/update cho QB hiện hữu, có thể upsert tương tự như nhánh trên
                // Validate: questionJp phải là tiếng Nhật nếu có
                if (
                  questionBankData.questionJp &&
                  !this.isJapaneseText(questionBankData.questionJp)
                ) {
                  throw new BadRequestException(
                    'questionJp phải là tiếng Nhật (Hiragana/Katakana/Kanji)'
                  )
                }

                if (
                  questionBankData.questionJp ||
                  questionBankData.pronunciation ||
                  questionBankData.audioUrl !== undefined ||
                  questionBankData.role !== undefined ||
                  questionBankData.levelN !== undefined
                ) {
                  const preAudio = preGeneratedAudioByQbId.get(qbId)
                  await tx.questionBank.update({
                    where: { id: qbId },
                    data: {
                      questionJp: questionBankData.questionJp || undefined,
                      pronunciation:
                        questionBankData.pronunciation !== undefined
                          ? questionBankData.pronunciation
                          : undefined,
                      audioUrl:
                        preAudio !== undefined
                          ? preAudio
                          : questionBankData.audioUrl !== undefined
                            ? questionBankData.audioUrl
                            : undefined,
                      role:
                        questionBankData.role !== undefined
                          ? questionBankData.role
                          : undefined,
                      levelN:
                        questionBankData.levelN !== undefined
                          ? questionBankData.levelN
                          : undefined
                    }
                  })
                }

                // Upsert meanings nếu có (dựa trên questionKey hiện có)
                if (questionBankData.meanings && questionBankData.meanings.length > 0) {
                  const qb = await tx.questionBank.findUnique({
                    where: { id: qbId },
                    select: { questionKey: true, questionType: true }
                  })
                  if (!qb) {
                    throw new BadRequestException(
                      `QuestionBank với ID ${qbId} không tồn tại`
                    )
                  }
                  const questionKey =
                    qb.questionKey || `question.${qb.questionType}.${qbId}`

                  const existingMeaningKeys = await tx.translation.findMany({
                    where: { key: { startsWith: questionKey + '.meaning.' } },
                    select: { key: true },
                    distinct: ['key'],
                    orderBy: { key: 'asc' }
                  })
                  const existingKeysArray = existingMeaningKeys.map((t) => t.key).sort()

                  for (let mi = 0; mi < questionBankData.meanings.length; mi++) {
                    const meaning = questionBankData.meanings[mi]
                    const meaningKey =
                      mi < existingKeysArray.length
                        ? existingKeysArray[mi]
                        : `${questionKey}.meaning.${mi + 1}`

                    for (const [languageCode, translationValue] of Object.entries(
                      meaning.translations
                    )) {
                      const language = await this.languagesService.findByCode({
                        code: languageCode
                      })
                      if (language?.data) {
                        await tx.translation.upsert({
                          where: {
                            languageId_key: {
                              languageId: language.data.id,
                              key: meaningKey
                            }
                          },
                          update: { value: translationValue },
                          create: {
                            languageId: language.data.id,
                            key: meaningKey,
                            value: translationValue
                          }
                        })
                      }
                    }
                  }
                }

                itemsToUpdate.push({
                  testSetQuestionBankId: 0,
                  questionBankId: qbId,
                  order
                })
              }
            } else {
              // Không có id = tạo questionBank mới
              if (newQuestionBankIndex < newQuestionBankIds.length) {
                const questionBankId = newQuestionBankIds[newQuestionBankIndex]
                itemsToUpdate.push({
                  testSetQuestionBankId: 0, // 0 = tạo mới
                  questionBankId,
                  order
                })
                newQuestionBankIndex++
              }
            }
          }

          // Nếu update, xóa tất cả questionBank cũ trước
          if (isUpdate) {
            await tx.testSetQuestionBank.deleteMany({
              where: { testSetId: testSetId }
            })
          }

          // Tạo lại tất cả với order mới
          for (const item of itemsToUpdate) {
            await tx.testSetQuestionBank.create({
              data: {
                testSetId: testSetId,
                questionBankId: item.questionBankId,
                questionOrder: item.order
              }
            })
          }
        }

        // Lấy testSet với questionBanks để trả về đầy đủ thông tin
        const testSetWithQuestions = await tx.testSet.findUnique({
          where: { id: testSet.id },
          include: {
            testSetQuestionBanks: {
              include: {
                questionBank: {
                  select: {
                    id: true,
                    questionJp: true,
                    questionType: true,
                    audioUrl: true,
                    pronunciation: true,
                    role: true,
                    levelN: true,
                    questionKey: true
                  }
                }
              },
              orderBy: {
                questionOrder: 'asc'
              }
            }
          }
        })

        return testSetWithQuestions
      })

      return {
        statusCode: isUpdate ? 200 : 201,
        data: result,
        message: isUpdate
          ? TEST_SET_MESSAGE.UPDATE_SUCCESS
          : TEST_SET_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof TestSetNotFoundException
      ) {
        throw error
      }
      this.logger.error(
        `Error ${isUpdate ? 'updating' : 'creating'} testset with questionBanks:`,
        error
      )
      throw new BadRequestException(
        `Không thể ${isUpdate ? 'cập nhật' : 'tạo'} bộ đề với questionBank`
      )
    }
  }

  // Lấy testset với questionBanks và full translations
  async findOneWithQuestionBanksFull(id: number): Promise<MessageResDTO> {
    try {
      const testSet = await this.prisma.testSet.findUnique({
        where: { id },
        include: {
          testSetQuestionBanks: {
            include: {
              questionBank: true
            },
            orderBy: {
              questionOrder: 'asc'
            }
          }
        }
      })

      if (!testSet) {
        throw TestSetNotFoundException
      }

      // Lấy full translations cho testset (name và description)
      const nameKey = `testset.${id}.name`
      const descriptionKey = `testset.${id}.description`

      // Lấy translations từ meaning keys (format: testset.{id}.name.meaning.1, testset.{id}.description.meaning.1, ...)
      const testSetTranslations = await this.prisma.translation.findMany({
        where: {
          OR: [
            { key: { startsWith: nameKey + '.meaning.' } },
            { key: { startsWith: descriptionKey + '.meaning.' } }
          ]
        },
        include: {
          language: true
        }
      })

      // Format translations cho testset
      const nameTranslations: Array<{ language: string; value: string }> = []
      const descriptionTranslations: Array<{ language: string; value: string }> = []

      testSetTranslations.forEach((trans) => {
        const translation = {
          language: trans.language.code,
          value: trans.value
        }
        if (trans.key.startsWith(nameKey + '.meaning.')) {
          nameTranslations.push(translation)
        } else if (trans.key.startsWith(descriptionKey + '.meaning.')) {
          descriptionTranslations.push(translation)
        }
      })

      // Format name theo yêu cầu: [{ vi: "...", en: "..." }]
      const nameFormatted =
        nameTranslations.length > 0
          ? [
              nameTranslations.reduce(
                (acc, trans) => {
                  acc[trans.language] = trans.value
                  return acc
                },
                {} as Record<string, string>
              )
            ]
          : testSet.name

      // Format description theo yêu cầu: [{ vi: "...", en: "..." }]
      const descriptionFormatted =
        descriptionTranslations.length > 0
          ? [
              descriptionTranslations.reduce(
                (acc, trans) => {
                  acc[trans.language] = trans.value
                  return acc
                },
                {} as Record<string, string>
              )
            ]
          : testSet.description

      // Lấy full translations cho mỗi questionBank
      const questionBanksWithTranslations = await Promise.all(
        testSet.testSetQuestionBanks.map(async (testSetQuestionBank) => {
          const questionBank = testSetQuestionBank.questionBank
          let meanings: Array<{ language: string; value: string }> = []

          if (questionBank.questionKey) {
            // Chỉ lấy translations từ meaning keys (không lấy questionKey chính)
            const questionTranslations = await this.prisma.translation.findMany({
              where: {
                key: { startsWith: questionBank.questionKey + '.meaning.' }
              },
              include: {
                language: true
              }
            })

            // Nếu không tìm thấy và key có format cũ, thử tìm theo format mới
            if (
              questionTranslations.length === 0 &&
              questionBank.questionKey.includes('.question')
            ) {
              const newKey = questionBank.questionKey
                .replace('.question', '')
                .replace(/^(\w+)\.(\d+)$/, 'question.$1.$2')
              const newTranslations = await this.prisma.translation.findMany({
                where: {
                  key: { startsWith: newKey + '.meaning.' }
                },
                include: {
                  language: true
                }
              })
              meanings = newTranslations.map((t) => ({
                language: t.language.code,
                value: t.value
              }))
            } else {
              meanings = questionTranslations.map((t) => ({
                language: t.language.code,
                value: t.value
              }))
            }
          }

          // Format meanings thành object: { vi: "...", en: "...", ja: "..." }
          const meaningsFormatted =
            meanings.length > 0
              ? meanings.reduce(
                  (acc, meaning) => {
                    acc[meaning.language] = meaning.value
                    return acc
                  },
                  {} as Record<string, string>
                )
              : {}

          return {
            id: testSetQuestionBank.id,
            questionOrder: testSetQuestionBank.questionOrder,
            questionBank: {
              id: questionBank.id,
              questionJp: questionBank.questionJp,
              questionType: questionBank.questionType,
              audioUrl: questionBank.audioUrl,
              pronunciation: questionBank.pronunciation,
              role: questionBank.role,
              levelN: questionBank.levelN,
              questionKey: questionBank.questionKey,
              meanings: meaningsFormatted
            }
          }
        })
      )

      // Format response
      const result = {
        id: testSet.id,
        name: nameFormatted,
        description: descriptionFormatted,
        content: testSet.content,
        audioUrl: testSet.audioUrl,
        price: testSet.price ? Number(testSet.price) : null,
        levelN: testSet.levelN,
        testType: testSet.testType,
        status: testSet.status,
        creatorId: testSet.creatorId,
        createdAt: testSet.createdAt,
        updatedAt: testSet.updatedAt,
        testSetQuestionBanks: questionBanksWithTranslations
      }

      return {
        statusCode: 200,
        data: result,
        message: TEST_SET_MESSAGE.GET_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding testset with questionBanks full:', error)
      if (error instanceof TestSetNotFoundException) {
        throw error
      }
      throw new BadRequestException('Không thể lấy thông tin bộ đề với questionBanks')
    }
  }
}
