import {
  CreateTestSetQuestionBankBodyType,
  UpdateTestSetQuestionBankBodyType,
  CreateMultipleTestSetQuestionBankBodyType,
  DeleteManyTestSetQuestionBankBodyType,
  TestSetQuestionBankType
} from './entities/testset-questionbank.entity'
import { TestSetQuestionBankRepo } from './testset-questionbank.repo'
import { QuestionBankService } from '@/modules/question-bank/question-bank.service'
import { TranslationHelperService } from '@/modules/translation/translation.helper.service'
import { pickLabelFromComposite } from '@/common/utils/prase.utils'
import { I18nService } from '@/i18n/i18n.service'
import { TestSetQuestionBankMessage as M } from '@/i18n/message-keys'
import {
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import { TestSetType } from '@prisma/client'
import {
  TestSetQuestionBankNotFoundException,
  TestSetQuestionBankAlreadyExistsException,
  InvalidTestSetQuestionBankDataException,
  TestSetQuestionBankRuleViolationException,
  TestSetNotFoundException,
  QuestionBankNotFoundException
} from './dto/testset-questionbank.error'

type TestSetRule = NonNullable<
  Awaited<ReturnType<TestSetQuestionBankRepo['findTestSet']>>
>
type QuestionRule = NonNullable<
  Awaited<ReturnType<TestSetQuestionBankRepo['findQuestionBank']>>
>

@Injectable()
export class TestSetQuestionBankService {
  private readonly logger = new Logger(TestSetQuestionBankService.name)

  constructor(
    private readonly testSetQuestionBankRepo: TestSetQuestionBankRepo,
    private readonly questionBankService: QuestionBankService,
    private readonly translationHelper: TranslationHelperService,
    private readonly i18nService: I18nService
  ) {}

  async create(data: CreateTestSetQuestionBankBodyType, lang: string = 'vi') {
    try {
      const testSet = await this.loadTestSet(data.testSetId)
      const created = await this.link(testSet, data.questionBankId)
      return {
        data: created,
        message: this.i18nService.translate(M.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toTestSetQuestionBankError(error)
    }
  }

  // Each question is linked on its own; failures are reported, not thrown.
  // statusCode (201 all / 207 some / 400 none) is sent as the HTTP status
  async createMultiple(
    data: CreateMultipleTestSetQuestionBankBodyType,
    lang: string = 'vi'
  ) {
    const testSet = await this.loadTestSet(data.testSetId).catch((error) => {
      throw this.toTestSetQuestionBankError(error)
    })
    const created: TestSetQuestionBankType[] = []
    const failed: { questionBankId: number; reason: string }[] = []
    for (const questionBankId of data.questionBankIds) {
      try {
        created.push(await this.link(testSet, questionBankId))
      } catch (error) {
        failed.push({ questionBankId, reason: this.failureReason(error, lang) })
      }
    }

    const total = data.questionBankIds.length
    const counts = { created: created.length, total, failed: failed.length }
    const [statusCode, key] =
      created.length === 0
        ? [400, M.MULTIPLE_NONE_CREATED]
        : failed.length > 0
          ? [207, M.MULTIPLE_PARTIAL]
          : [201, M.MULTIPLE_CREATED]
    return {
      statusCode,
      data: {
        created,
        failed,
        summary: { total, success: created.length, failed: failed.length }
      },
      message: this.i18nService.translate(key, lang, counts)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const link = await this.testSetQuestionBankRepo.findById(id)
    if (!link) throw new TestSetQuestionBankNotFoundException()
    return { data: link, message: this.i18nService.translate(M.GET_SUCCESS, lang) }
  }

  async findByTestSetId(testSetId: number, lang: string = 'vi') {
    await this.loadTestSet(testSetId)
    const links = await this.testSetQuestionBankRepo.findByTestSetId(testSetId)
    return { data: links, message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang) }
  }

  // HTTP routes: a missing test set is a 404 (internal callers get an empty list)
  async getFullByTestSetId(testSetId: number, lang: string = 'vi') {
    await this.loadTestSet(testSetId)
    return this.findFullByTestSetId(testSetId, lang)
  }

  async getFullWithAnswerByTestSetId(testSetId: number, lang: string = 'vi') {
    await this.loadTestSet(testSetId)
    return this.findFullWithAnswerByTestSetId(testSetId, lang)
  }

  // Used by user-test-attempt; returns { statusCode, data: [...], message }
  async findFullByTestSetId(testSetId: number, languageCode: string = 'vi') {
    try {
      const links = await this.testSetQuestionBankRepo.findByTestSetId(testSetId)
      const questionBanks = await this.questionBanksOf(links)
      const data = links
        .map((l) => {
          const qb = questionBanks.get(l.questionBankId)
          if (!qb) return null
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
            answers: this.answersOf(qb, languageCode)
          }
        })
        .filter(Boolean)
      return {
        statusCode: 200,
        data,
        message: this.i18nService.translate(M.GET_LIST_SUCCESS, languageCode)
      }
    } catch (error) {
      throw this.toTestSetQuestionBankError(error)
    }
  }

  // Used by test; question text from translations, falling back to the JP text
  async findFullWithAnswerByTestSetId(testSetId: number, languageCode: string) {
    try {
      const links = await this.testSetQuestionBankRepo.findByTestSetId(testSetId)
      const lang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'
      const questionBanks = await this.questionBanksOf(links)
      const data = (
        await Promise.all(
          links.map(async (l) => {
            const qb = questionBanks.get(l.questionBankId)
            if (!qb) return null
            return {
              id: l.id,
              questionOrder: l.questionOrder,
              questionBank: {
                id: qb.id,
                question: (await this.questionTextOf(qb, lang)) || qb.questionJp || '',
                questionType: qb.questionType,
                audioUrl: qb.audioUrl,
                pronunciation: qb.pronunciation,
                role: qb.role,
                levelN: qb.levelN,
                answers: this.answersOf(qb, lang)
              }
            }
          })
        )
      ).filter(Boolean)
      return {
        statusCode: 200,
        data,
        message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toTestSetQuestionBankError(error)
    }
  }

  async update(id: number, data: UpdateTestSetQuestionBankBodyType, lang: string = 'vi') {
    try {
      const existing = await this.testSetQuestionBankRepo.findById(id)
      if (!existing) throw new TestSetQuestionBankNotFoundException()

      // Moving the link to another test set or question: same rules as create
      if (data.testSetId || data.questionBankId) {
        const testSet = await this.loadTestSet(data.testSetId ?? existing.testSetId)
        const question = await this.loadQuestionBank(
          data.questionBankId ?? existing.questionBankId
        )
        const broken = this.brokenRule(testSet, question)
        if (broken) throw broken
      }

      const updated = await this.testSetQuestionBankRepo.update(id, data)
      return {
        data: updated,
        message: this.i18nService.translate(M.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toTestSetQuestionBankError(error)
    }
  }

  async updateQuestionOrder(id: number, questionOrder: number, lang: string = 'vi') {
    try {
      const updated = await this.testSetQuestionBankRepo.update(id, { questionOrder })
      return {
        data: updated,
        message: this.i18nService.translate(M.UPDATE_QUESTION_ORDER_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toTestSetQuestionBankError(error)
    }
  }

  async delete(id: number, lang: string = 'vi') {
    try {
      await this.testSetQuestionBankRepo.delete(id)
      return { message: this.i18nService.translate(M.DELETE_SUCCESS, lang) }
    } catch (error) {
      throw this.toTestSetQuestionBankError(error)
    }
  }

  async deleteMany(body: DeleteManyTestSetQuestionBankBodyType, lang: string = 'vi') {
    const result = await this.testSetQuestionBankRepo.deleteMany(body.ids)
    return {
      data: { deletedCount: result.count },
      message: this.i18nService.translate(M.DELETE_SUCCESS, lang)
    }
  }

  async deleteByTestSetId(testSetId: number, lang: string = 'vi') {
    const result = await this.testSetQuestionBankRepo.deleteByTestSetId(testSetId)
    return {
      data: { deletedCount: result.count },
      message: this.i18nService.translate(M.DELETE_BY_TESTSET_SUCCESS, lang)
    }
  }

  //#region helpers
  private async loadTestSet(id: number) {
    const testSet = await this.testSetQuestionBankRepo.findTestSet(id)
    if (!testSet) throw new TestSetNotFoundException()
    return testSet
  }

  private async loadQuestionBank(id: number) {
    const question = await this.testSetQuestionBankRepo.findQuestionBank(id)
    if (!question) throw new QuestionBankNotFoundException()
    return question
  }

  // Appends the question after the last one in the test set
  private async link(testSet: TestSetRule, questionBankId: number) {
    const question = await this.loadQuestionBank(questionBankId)
    const broken = this.brokenRule(testSet, question)
    if (broken) throw broken
    const existing = await this.testSetQuestionBankRepo.findByTestSetAndQuestionBank(
      testSet.id,
      questionBankId
    )
    if (existing) throw new TestSetQuestionBankAlreadyExistsException()
    return this.testSetQuestionBankRepo.create({
      testSetId: testSet.id,
      questionBankId,
      questionOrder: (await this.testSetQuestionBankRepo.maxQuestionOrder(testSet.id)) + 1
    })
  }

  // Type: a GENERAL test set takes any question, others only their own type.
  // Level: a test set without one (null/0) takes any level; GENERAL takes the
  // same or a lower level, others only the same level
  private brokenRule(
    testSet: TestSetRule,
    question: QuestionRule
  ): TestSetQuestionBankRuleViolationException | null {
    const general = testSet.testType === TestSetType.GENERAL
    if (!general && String(testSet.testType) !== String(question.questionType)) {
      return new TestSetQuestionBankRuleViolationException(M.TYPE_INCOMPATIBLE)
    }
    if (!testSet.levelN) return null
    const levels = { testSetLevel: testSet.levelN, questionLevel: question.levelN ?? '-' }
    if (general) {
      return question.levelN && question.levelN > testSet.levelN
        ? new TestSetQuestionBankRuleViolationException(M.LEVEL_ABOVE_TEST_SET, levels)
        : null
    }
    return question.levelN !== testSet.levelN
      ? new TestSetQuestionBankRuleViolationException(M.LEVEL_MISMATCH, levels)
      : null
  }

  // Why one question of createMultiple was not linked, in the request language
  private failureReason(error: unknown, lang: string): string {
    const response = error instanceof HttpException ? error.getResponse() : null
    if (response && typeof response === 'object' && 'errorKey' in response) {
      const { errorKey, errorArgs } = response as {
        errorKey: string
        errorArgs?: Record<string, string | number>
      }
      return this.i18nService.translate(errorKey, lang, errorArgs)
    }
    if (isUniqueConstraintPrismaError(error)) {
      return this.i18nService.translate(M.ALREADY_EXISTS, lang)
    }
    this.logger.error(
      'Linking a question failed',
      error instanceof Error ? error.stack : error
    )
    return this.i18nService.translate(M.UNKNOWN_FAILURE, lang)
  }

  // Full question banks (with answers), keyed by id
  private async questionBanksOf(links: TestSetQuestionBankType[]) {
    const results = await Promise.all(
      links.map((l) => this.questionBankService.findOne(l.questionBankId))
    )
    return new Map<number, any>(results.map((res: any) => [res.data.id, res.data]))
  }

  private answersOf(qb: any, lang: string) {
    return (qb?.answers || []).map((ans: any) => ({
      id: ans.id,
      answer: pickLabelFromComposite(ans?.answerJp || '', lang)
    }))
  }

  // Tries the key, then the .meaning.1 and .question variants, each in the
  // language and then in vi
  private async questionTextOf(qb: any, lang: string): Promise<string> {
    if (!qb?.questionKey) return ''
    const key: string = qb.questionKey
    const candidates = [
      key,
      key.endsWith('.meaning.1') ? key : `${key}.meaning.1`,
      key.endsWith('.question') ? key : `${key}.question`
    ]
    for (const candidate of candidates) {
      const text =
        (await this.translationHelper.getTranslation(candidate, lang)) ||
        (await this.translationHelper.getTranslation(candidate, 'vi'))
      if (text) return text
    }
    return ''
  }

  private toTestSetQuestionBankError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'TestSetQuestionBank request failed',
      error instanceof Error ? error.stack : error
    )
    if (isUniqueConstraintPrismaError(error)) {
      return new TestSetQuestionBankAlreadyExistsException()
    }
    if (isNotFoundPrismaError(error)) return new TestSetQuestionBankNotFoundException()
    return new InvalidTestSetQuestionBankDataException()
  }
  //#endregion
}
