import {
  CreateTestSetQuestionBankBodyType,
  UpdateTestSetQuestionBankBodyType,
  CreateMultipleTestSetQuestionBankBodyType,
  TestSetQuestionBankType
} from './entities/testset-questionbank.entities'
import { TestSetQuestionBankRepository } from './testset-questionbank.repo'
import { TestSetService } from '@/modules/testset/testset.service'
import { QuestionBankService } from '@/modules/question-bank/question-bank.service'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { TEST_SET_QUESTIONBANK_MESSAGE } from '@/common/constants/message'
import { BadRequestException } from '@nestjs/common'
import { Injectable, Logger, HttpException } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { TranslationHelperService } from '@/modules/translation/translation.helper.service'
import { pickLabelFromComposite } from '@/common/utils/prase.utils'
import {
  TestSetQuestionBankNotFoundException,
  TestSetQuestionBankAlreadyExistsException,
  InvalidTestSetQuestionBankDataException,
  TestSetQuestionBankTypeIncompatibleException,
  TestSetNotFoundException,
  QuestionBankNotFoundException
} from './dto/testset-questionbank.error'
import { DeleteManyTestSetQuestionBankBodyType } from './entities/testset-questionbank.entities'

@Injectable()
export class TestSetQuestionBankService {
  private readonly logger = new Logger(TestSetQuestionBankService.name)

  constructor(
    private readonly testSetQuestionBankRepository: TestSetQuestionBankRepository,
    private readonly testSetService: TestSetService,
    private readonly questionBankService: QuestionBankService,
    private readonly translationHelper: TranslationHelperService,
    private readonly prismaService: PrismaService
  ) {}

  async create(data: CreateTestSetQuestionBankBodyType): Promise<MessageResDTO> {
    try {
      this.logger.log(`Creating TestSetQuestionBank with data: ${JSON.stringify(data)}`)

      // Validate TestSet exists and get testsetType
      const testSet = await this.testSetService.getTestSetById(data.testSetId)
      if (!testSet) {
        throw TestSetNotFoundException
      }

      // Validate QuestionBank exists and get questionType

      const questionBank = await this.questionBankService.findOne(
        Number(data.questionBankId)
      )
      if (!questionBank) {
        throw QuestionBankNotFoundException
      }

      // Validate testsetType and questionType compatibility
      const testsetType = testSet.data.testType
      const questionType = questionBank.data.questionType

      // Ensure both values exist
      if (!testsetType || !questionType) {
        throw new BadRequestException(
          TEST_SET_QUESTIONBANK_MESSAGE.INVALID_TYPE_DATA.replace(
            '{testsetType}',
            String(testsetType)
          ).replace('{questionType}', String(questionType))
        )
      }

      // Normalize to uppercase for comparison
      const normalizedTestsetType = String(testsetType).toUpperCase().trim()
      const normalizedQuestionType = String(questionType).toUpperCase().trim()

      // Check compatibility logic:
      // - If testsetType is GENERAL, allow any questionType
      // - Otherwise, testsetType must match questionType exactly
      if (
        normalizedTestsetType !== 'GENERAL' &&
        normalizedTestsetType !== normalizedQuestionType
      ) {
        throw TestSetQuestionBankTypeIncompatibleException
      }

      // Validate levelN compatibility
      const testSetLevelN = testSet.data.levelN
      const questionBankLevelN = questionBank.data.levelN

      if (testsetType === 'GENERAL') {
        // For GENERAL TestSet: QuestionBank levelN should be <= TestSet levelN
        if (questionBankLevelN && testSetLevelN && questionBankLevelN > testSetLevelN) {
          throw new BadRequestException(
            `Level không phù hợp: TestSet có level ${testSetLevelN} nhưng QuestionBank có level ${questionBankLevelN}. Với TestSet loại GENERAL, QuestionBank phải có level bằng hoặc nhỏ hơn TestSet`
          )
        }
      } else {
        // For specific TestSet types: QuestionBank levelN must equal TestSet levelN
        if (questionBankLevelN !== testSetLevelN) {
          throw new BadRequestException(
            `Level không phù hợp: TestSet có level ${testSetLevelN} nhưng QuestionBank gor level ${questionBankLevelN}. Với TestSet loại cụ thể, QuestionBank phải có level bằng TestSet`
          )
        }
      }

      // Check if TestSetQuestionBank already exists
      const existing =
        await this.testSetQuestionBankRepository.findByTestSetAndQuestionBank(
          data.testSetId,
          data.questionBankId
        )
      if (existing) {
        throw TestSetQuestionBankAlreadyExistsException
      }

      // Auto-calculate questionOrder (next available order)
      const currentCount = await this.testSetQuestionBankRepository.countByTestSetId(
        data.testSetId
      )
      const nextOrder = currentCount + 1

      const testSetQuestionBank = await this.testSetQuestionBankRepository.create({
        ...data,
        questionOrder: nextOrder
      })

      return {
        statusCode: 201,
        data: testSetQuestionBank,
        message: TEST_SET_QUESTIONBANK_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error creating TestSetQuestionBank:', error)
      if (
        error instanceof HttpException ||
        error.message?.includes('không tồn tại') ||
        error.message?.includes('đã tồn tại')
      ) {
        throw error
      }
      throw InvalidTestSetQuestionBankDataException
    }
  }

  async createMultiple(
    data: CreateMultipleTestSetQuestionBankBodyType
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(
        `Creating multiple TestSetQuestionBank with data: ${JSON.stringify(data)}`
      )

      // Validate TestSet exists and get testsetType
      const testSet = await this.testSetService.getTestSetById(data.testSetId)
      if (!testSet) {
        throw TestSetNotFoundException
      }

      const testsetType = testSet.data.testType
      const createdItems: TestSetQuestionBankType[] = []
      const failedItems: { questionBankId: number; reason: string }[] = []

      // Process each questionBankId
      for (const questionBankId of data.questionBankIds) {
        try {
          // Validate QuestionBank exists and get questionType
          const questionBank = await this.questionBankService.findOne(
            Number(questionBankId)
          )
          if (!questionBank) {
            failedItems.push({
              questionBankId,
              reason: 'QuestionBank không tồn tại'
            })
            continue
          }

          const questionType = questionBank.data.questionType

          // Validate testsetType and questionType compatibility
          // Ensure both values exist and are strings
          if (!testsetType || !questionType) {
            failedItems.push({
              questionBankId,
              reason: TEST_SET_QUESTIONBANK_MESSAGE.INVALID_TYPE_DATA.replace(
                '{testsetType}',
                String(testsetType)
              ).replace('{questionType}', String(questionType))
            })
            continue
          }

          // Normalize to uppercase for comparison
          const normalizedTestsetType = String(testsetType).toUpperCase().trim()
          const normalizedQuestionType = String(questionType).toUpperCase().trim()

          // Check compatibility logic:
          // - If testsetType is GENERAL, allow any questionType
          // - Otherwise, testsetType must match questionType exactly
          if (
            normalizedTestsetType !== 'GENERAL' &&
            normalizedTestsetType !== normalizedQuestionType
          ) {
            failedItems.push({
              questionBankId,
              reason: `Loại không tương thích: TestSet có loại "${testsetType}" nhưng QuestionBank có loại "${questionType}". Chỉ có thể thêm QuestionBank loại "${testsetType}" hoặc GENERAL vào TestSet loại "${testsetType}"`
            })
            continue
          }

          // Validate levelN compatibility
          const testSetLevelN = testSet.data.levelN
          const questionBankLevelN = questionBank.data.levelN

          // Nếu TestSet có levelN = 0, cho phép mọi levelN
          if (testSetLevelN === 0 || testSetLevelN === null) {
            // Bỏ qua validation levelN, cho phép mọi levelN
          } else if (testsetType === 'GENERAL') {
            // For GENERAL TestSet: QuestionBank levelN should be <= TestSet levelN
            if (
              questionBankLevelN &&
              testSetLevelN &&
              questionBankLevelN > testSetLevelN
            ) {
              failedItems.push({
                questionBankId,
                reason: `Level không phù hợp: TestSet có level ${testSetLevelN} nhưng QuestionBank có level ${questionBankLevelN}. Với TestSet loại GENERAL, QuestionBank phải có level bằng hoặc nhỏ hơn TestSet`
              })
              continue
            }
          } else {
            // For specific TestSet types: QuestionBank levelN must equal TestSet levelN
            if (questionBankLevelN !== testSetLevelN) {
              failedItems.push({
                questionBankId,
                reason: `Level không phù hợp: TestSet có level ${testSetLevelN} nhưng QuestionBank có level ${questionBankLevelN}. Với TestSet loại cụ thể, QuestionBank phải có level bằng TestSet`
              })
              continue
            }
          }

          // Check if TestSetQuestionBank already exists
          const existing =
            await this.testSetQuestionBankRepository.findByTestSetAndQuestionBank(
              data.testSetId,
              questionBankId
            )
          if (existing) {
            failedItems.push({
              questionBankId,
              reason: 'Liên kết đã tồn tại'
            })
            continue
          }

          // Auto-calculate questionOrder (next available order)
          const currentCount = await this.testSetQuestionBankRepository.countByTestSetId(
            data.testSetId
          )
          const nextOrder = currentCount + 1

          // Create the TestSetQuestionBank
          const testSetQuestionBank = await this.testSetQuestionBankRepository.create({
            testSetId: data.testSetId,
            questionBankId: questionBankId,
            questionOrder: nextOrder
          })

          createdItems.push(testSetQuestionBank)
        } catch (error) {
          this.logger.error(`Error processing questionBankId ${questionBankId}:`, error)
          failedItems.push({
            questionBankId,
            reason: 'Lỗi không xác định'
          })
        }
      }

      // Determine status code based on results
      let statusCode = 201
      let message = `Tạo thành công ${createdItems.length}/${data.questionBankIds.length} liên kết`

      if (createdItems.length === 0) {
        statusCode = 400
        message = 'Không thể tạo liên kết nào'
      } else if (failedItems.length > 0) {
        statusCode = 207 // Multi-status: partial success
        message = `Tạo thành công ${createdItems.length}/${data.questionBankIds.length} liên kết. ${failedItems.length} liên kết không thể tạo`
      }

      return {
        statusCode,
        data: {
          created: createdItems,
          failed: failedItems,
          summary: {
            total: data.questionBankIds.length,
            success: createdItems.length,
            failed: failedItems.length
          }
        },
        message
      }
    } catch (error) {
      this.logger.error('Error creating multiple TestSetQuestionBank:', error)
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidTestSetQuestionBankDataException
    }
  }

  async findById(id: number): Promise<TestSetQuestionBankType> {
    try {
      this.logger.log(`Finding TestSetQuestionBank by id: ${id}`)

      const testSetQuestionBank = await this.testSetQuestionBankRepository.findById(id)
      if (!testSetQuestionBank) {
        throw TestSetQuestionBankNotFoundException
      }

      return testSetQuestionBank
    } catch (error) {
      this.logger.error('Error finding TestSetQuestionBank by id:', error)
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidTestSetQuestionBankDataException
    }
  }

  async findByTestSetId(testSetId: number): Promise<MessageResDTO> {
    try {
      this.logger.log(`Finding TestSetQuestionBank by testSetId: ${testSetId}`)

      // Validate TestSet exists
      const testSet = await this.testSetService.getTestSetById(testSetId)
      if (!testSet) {
        throw TestSetNotFoundException
      }

      const testSetQuestionBanks =
        await this.testSetQuestionBankRepository.findByTestSetId(testSetId)

      return {
        statusCode: 200,
        data: testSetQuestionBanks,
        message: TEST_SET_QUESTIONBANK_MESSAGE.GET_LIST_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding TestSetQuestionBank by testSetId:', error)
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidTestSetQuestionBankDataException
    }
  }

  async findFullByTestSetId(
    testSetId: number,
    languageCode: string = 'vi'
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(`Finding QuestionBanks with answers by testSetId: ${testSetId}`)

      const links = await this.testSetQuestionBankRepository.findByTestSetId(testSetId)

      let questionBanks = [] as any[]
      if (links.length > 0) {
        // Lấy tất cả QuestionBank IDs
        const questionBankIds = links.map((l) => l.questionBankId)

        // Lấy đầy đủ QuestionBanks với answers bằng cách gọi findOne cho mỗi ID
        const qbPromises = questionBankIds.map((id) =>
          this.questionBankService.findOne(id)
        )
        const qbResults = await Promise.all(qbPromises)
        const idToQB = new Map(qbResults.map((res: any) => [res.data.id, res.data]))

        // Map với translations
        questionBanks = await Promise.all(
          links
            .sort((a, b) => a.questionOrder - b.questionOrder)
            .map(async (l) => {
              const qb = idToQB.get(l.questionBankId)
              if (!qb) return null

              // Map answers với translations
              const mappedAnswers = await Promise.all(
                (qb?.answers || []).map(async (ans: any) => {
                  const answerLabel = pickLabelFromComposite(
                    ans?.answerJp || '',
                    languageCode
                  )
                  return {
                    id: ans.id,
                    answer: answerLabel
                  }
                })
              )

              return {
                id: l.id, // id của TestSetQuestionBank
                questionOrder: l.questionOrder,
                questionBankId: qb.id,
                questionJp: qb.questionJp || null,
                questionType: qb.questionType,
                audioUrl: qb.audioUrl || null,
                questionKey: qb.questionKey || null,
                pronunciation: qb.pronunciation || null,
                role: qb.role || null,
                levelN: qb.levelN || null,
                createdById: qb.createdById || null,
                createdAt: qb.createdAt,
                updatedAt: qb.updatedAt,
                answers: mappedAnswers
              }
            })
        )
        questionBanks = questionBanks.filter(Boolean) as any[]
      }

      return {
        statusCode: 200,
        data: questionBanks,
        message: TEST_SET_QUESTIONBANK_MESSAGE.GET_LIST_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding QuestionBanks with answers by testSetId:', error)
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidTestSetQuestionBankDataException
    }
  }

  async findFullWithAnswerByTestSetId(
    testSetId: number,
    languageCode: string
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(
        `Finding QuestionBanks with answers by testSetId: ${testSetId}, language: ${languageCode}`
      )

      const links = await this.testSetQuestionBankRepository.findByTestSetId(testSetId)
      const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'

      let questionBanks = [] as any[]
      if (links.length > 0) {
        // Lấy tất cả QuestionBank IDs
        const questionBankIds = links.map((l) => l.questionBankId)

        // Lấy đầy đủ QuestionBanks với answers bằng cách gọi findOne cho mỗi ID
        const qbPromises = questionBankIds.map((id) =>
          this.questionBankService.findOne(id)
        )
        const qbResults = await Promise.all(qbPromises)
        const idToQB = new Map(qbResults.map((res: any) => [res.data.id, res.data]))

        // Map với translations
        questionBanks = await Promise.all(
          links
            .sort((a, b) => a.questionOrder - b.questionOrder)
            .map(async (l) => {
              const qb = idToQB.get(l.questionBankId)
              if (!qb) return null

              // Resolve question text via translation keys
              let questionText = ''
              if (qb?.questionKey) {
                const triedLang = normalizedLang
                const keyCandidates = [
                  qb.questionKey,
                  qb.questionKey.endsWith('.meaning.1')
                    ? qb.questionKey
                    : `${qb.questionKey}.meaning.1`,
                  qb.questionKey.endsWith('.question')
                    ? qb.questionKey
                    : `${qb.questionKey}.question`
                ]
                for (const key of keyCandidates) {
                  questionText =
                    (await this.translationHelper.getTranslation(key, triedLang)) || ''
                  if (!questionText) {
                    questionText =
                      (await this.translationHelper.getTranslation(key, 'vi')) || ''
                  }
                  if (questionText) break
                }
              }
              if (!questionText) {
                // fallback to JP original if translation is missing
                questionText = qb?.questionJp || ''
              }

              // Map answers với translations
              const mappedAnswers = await Promise.all(
                (qb?.answers || []).map(async (ans: any) => {
                  // Derive from answerJp composite string based on language
                  const answerLabel = pickLabelFromComposite(
                    ans?.answerJp || '',
                    normalizedLang
                  )
                  return {
                    id: ans.id,
                    answer: answerLabel
                  }
                })
              )

              return {
                id: l.id,
                questionOrder: l.questionOrder,
                questionBank: {
                  id: qb.id,
                  question: questionText,
                  questionType: qb.questionType,
                  audioUrl: qb.audioUrl,
                  pronunciation: qb.pronunciation,
                  role: qb.role,
                  levelN: qb.levelN,
                  answers: mappedAnswers
                }
              }
            })
        )
        questionBanks = questionBanks.filter(Boolean) as any[]
      }

      return {
        statusCode: 200,
        data: questionBanks,
        message: TEST_SET_QUESTIONBANK_MESSAGE.GET_LIST_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding QuestionBanks with answers by testSetId:', error)
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidTestSetQuestionBankDataException
    }
  }

  async update(
    id: number,
    data: UpdateTestSetQuestionBankBodyType
  ): Promise<MessageResDTO> {
    try {
      this.logger.log(
        `Updating TestSetQuestionBank with id: ${id}, data: ${JSON.stringify(data)}`
      )

      // Check if TestSetQuestionBank exists
      const existing = await this.testSetQuestionBankRepository.findById(id)
      if (!existing) {
        throw TestSetQuestionBankNotFoundException
      }

      // Validate TestSet exists if testSetId is being updated
      if (data.testSetId) {
        const testSet = await this.testSetService.getTestSetById(data.testSetId)
        if (!testSet) {
          throw TestSetNotFoundException
        }
      }

      // Validate QuestionBank exists if questionBankId is being updated
      if (data.questionBankId) {
        const questionBank = await this.questionBankService.findOne(
          Number(data.questionBankId)
        )
        if (!questionBank) {
          throw QuestionBankNotFoundException
        }
      }

      const updatedTestSetQuestionBank = await this.testSetQuestionBankRepository.update(
        id,
        data
      )

      return {
        statusCode: 200,
        data: updatedTestSetQuestionBank,
        message: TEST_SET_QUESTIONBANK_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error updating TestSetQuestionBank:', error)
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidTestSetQuestionBankDataException
    }
  }

  async updateQuestionOrder(id: number, questionOrder: number): Promise<MessageResDTO> {
    try {
      this.logger.log(
        `Updating question order for TestSetQuestionBank with id: ${id}, order: ${questionOrder}`
      )

      // Check if TestSetQuestionBank exists
      const existing = await this.testSetQuestionBankRepository.findById(id)
      if (!existing) {
        throw TestSetQuestionBankNotFoundException
      }

      const updatedTestSetQuestionBank =
        await this.testSetQuestionBankRepository.updateQuestionOrder(id, questionOrder)

      return {
        statusCode: 200,
        data: updatedTestSetQuestionBank,
        message: TEST_SET_QUESTIONBANK_MESSAGE.UPDATE_QUESTION_ORDER_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error updating question order:', error)
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidTestSetQuestionBankDataException
    }
  }

  async delete(id: number): Promise<MessageResDTO> {
    try {
      this.logger.log(`Deleting TestSetQuestionBank with id: ${id}`)

      // Check if TestSetQuestionBank exists
      const existing = await this.testSetQuestionBankRepository.findById(id)
      if (!existing) {
        throw TestSetQuestionBankNotFoundException
      }

      await this.testSetQuestionBankRepository.delete(id)

      return {
        statusCode: 200,
        data: null,
        message: TEST_SET_QUESTIONBANK_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error deleting TestSetQuestionBank:', error)
      if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
        throw error
      }
      throw InvalidTestSetQuestionBankDataException
    }
  }

  async deleteMany(body: DeleteManyTestSetQuestionBankBodyType): Promise<MessageResDTO> {
    try {
      this.logger.log(
        `Deleting multiple TestSetQuestionBank with ids: ${JSON.stringify(body.ids)}`
      )

      const result = await this.testSetQuestionBankRepository.deleteMany(body.ids)

      return {
        statusCode: 200,
        data: { deletedCount: result.count },
        message: TEST_SET_QUESTIONBANK_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error deleting multiple TestSetQuestionBank:', error)
      if (error instanceof HttpException) {
        throw error
      }
      throw InvalidTestSetQuestionBankDataException
    }
  }

  async deleteByTestSetId(testSetId: number): Promise<MessageResDTO> {
    try {
      this.logger.log(`Deleting TestSetQuestionBank by testSetId: ${testSetId}`)

      const result = await this.testSetQuestionBankRepository.deleteByTestSetId(testSetId)

      return {
        statusCode: 200,
        data: { deletedCount: result.count },
        message: TEST_SET_QUESTIONBANK_MESSAGE.DELETE_BY_TESTSET_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error deleting TestSetQuestionBank by testSetId:', error)
      throw InvalidTestSetQuestionBankDataException
    }
  }

  async deleteByQuestionBankId(questionBankId: number): Promise<MessageResDTO> {
    try {
      this.logger.log(`Deleting TestSetQuestionBank by questionBankId: ${questionBankId}`)

      const result =
        await this.testSetQuestionBankRepository.deleteByQuestionBankId(questionBankId)

      return {
        statusCode: 200,
        data: { deletedCount: result.count },
        message: TEST_SET_QUESTIONBANK_MESSAGE.DELETE_BY_QUESTIONBANK_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error deleting TestSetQuestionBank by questionBankId:', error)
      throw InvalidTestSetQuestionBankDataException
    }
  }
}
