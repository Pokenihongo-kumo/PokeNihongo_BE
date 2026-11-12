import { HttpException, Injectable, Logger } from '@nestjs/common'
import { QuestionType, TestSetType as PrismaTestSetType } from '@prisma/client'
import { TestSetRepo, UpsertQuestion } from './testset.repo'
import {
  GetTestSetListQueryType,
  TestSetType,
  UpdateTestSetBodyType,
  CreateTestSetWithMeaningsBodyType,
  UpdateTestSetWithMeaningsBodyType,
  UpsertQuestionBankType,
  UpsertTestSetWithQuestionBanksBodyType
} from './entities/testset.entity'
import {
  InvalidTestSetDataException,
  TestSetChangeNotAllowedException,
  TestSetNotFoundException,
  TestSetQuestionBankNotFoundException
} from './dto/testset.error'
import { QuestionBankService } from '../question-bank/question-bank.service'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { I18nService } from '@/i18n/i18n.service'
import { TestSetMessage as M } from '@/i18n/message-keys'
import { toPaginationMeta } from '@/shared/utils/pagination'
import { isNotFoundPrismaError } from '@/shared/utils/prisma-errors'

const { GENERAL } = PrismaTestSetType

@Injectable()
export class TestSetService {
  private readonly logger = new Logger(TestSetService.name)

  constructor(
    private readonly testSetRepo: TestSetRepo,
    private readonly questionBankService: QuestionBankService,
    private readonly textToSpeechService: TextToSpeechService,
    private readonly i18nService: I18nService
  ) {}

  // GET /testset and /testset/basic (same result)
  async findAll(query: GetTestSetListQueryType, lang: string = 'vi') {
    const { data, total } = await this.testSetRepo.findMany(query)
    // statusCode: the list serializer needs it
    return {
      statusCode: 200,
      data: {
        results: data,
        pagination: toPaginationMeta(query.currentPage, query.pageSize, total)
      },
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang)
    }
  }

  // name/description in the request language
  async findOne(id: number, lang: string = 'vi') {
    const testSet = await this.testSetRepo.findById(id, lang)
    if (!testSet) throw new TestSetNotFoundException()
    return { data: testSet, message: this.i18nService.translate(M.GET_SUCCESS, lang) }
  }

  // Every translation, for editing
  async findOneWithQuestionBanksFull(id: number, lang: string = 'vi') {
    const testSet = await this.testSetRepo.findWithQuestionBanksFull(id)
    if (!testSet) throw new TestSetNotFoundException()
    return { data: testSet, message: this.i18nService.translate(M.GET_SUCCESS, lang) }
  }

  async createTestSetWithMeanings(
    data: CreateTestSetWithMeaningsBodyType,
    userId: number,
    lang: string = 'vi'
  ) {
    try {
      const testSet = await this.testSetRepo.createWithMeanings(data, userId)
      return {
        data: testSet,
        message: this.i18nService.translate(M.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toTestSetError(error)
    }
  }

  async updateTestSet(id: number, data: UpdateTestSetBodyType, lang: string = 'vi') {
    try {
      await this.assertChangeAllowed(await this.loadTestSet(id), data)
      const testSet = await this.testSetRepo.updateWithTranslations(id, data)
      return {
        data: testSet,
        message: this.i18nService.translate(M.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toTestSetError(error)
    }
  }

  async updateTestSetWithMeanings(
    id: number,
    data: UpdateTestSetWithMeaningsBodyType,
    lang: string = 'vi'
  ) {
    try {
      await this.assertChangeAllowed(await this.loadTestSet(id), data)
      const testSet = await this.testSetRepo.updateWithMeanings(id, data)
      return {
        data: testSet,
        message: this.i18nService.translate(M.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toTestSetError(error)
    }
  }

  // Returns the deleted test set (with its translations)
  async deleteTestSet(id: number, lang: string = 'vi') {
    try {
      const testSet = await this.loadTestSet(id)
      await this.testSetRepo.delete(id)
      return {
        data: testSet,
        message: this.i18nService.translate(M.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toTestSetError(error)
    }
  }

  // Without id: create (201). With id: update (200) and replace the questions.
  // A question with id is an existing link of this test set (TestSetQuestionBank
  // id) or else an existing QuestionBank; without id it is a new QuestionBank
  async upsertTestSetWithQuestionBanks(
    data: UpsertTestSetWithQuestionBanksBodyType,
    userId: number,
    lang: string = 'vi'
  ) {
    const isUpdate = !!data.id
    try {
      if (data.id) await this.loadTestSet(data.id)
      const links = data.id ? await this.testSetRepo.linksOf(data.id) : new Map()
      const inputs = data.questionBanks ?? []
      const questionBankIdOf = (q: UpsertQuestionBankType) =>
        q.id ? (links.get(q.id) ?? q.id) : undefined

      // Every referenced QuestionBank must exist before anything is written
      const existingIds = inputs.flatMap((q) => questionBankIdOf(q) ?? [])
      const known = await this.testSetRepo.questionBanksByIds(existingIds)
      const missing = existingIds.find((id) => !known.has(id))
      if (missing) throw new TestSetQuestionBankNotFoundException(missing)

      // Slow IO outside the transaction: speech for edited LISTENING/SPEAKING
      // questions, then the new QuestionBanks
      const questions: UpsertQuestion[] = []
      for (const q of inputs) {
        const id = questionBankIdOf(q)
        if (!id) {
          questions.push({ questionBankId: await this.createQuestionBank(q, userId) })
          continue
        }
        const qb = known.get(id)!
        questions.push({
          questionBankId: id,
          edit: {
            questionJp: q.questionJp,
            pronunciation: q.pronunciation,
            audioUrl: (await this.regeneratedAudio(q)) ?? q.audioUrl,
            role: q.role,
            levelN: q.levelN
          },
          questionKey: qb.questionKey || `question.${qb.questionType}.${id}`,
          meanings: q.meanings
        })
      }

      const testSet = await this.testSetRepo.saveWithQuestions({
        id: data.id,
        userId,
        fields: {
          content: data.content,
          audioUrl: data.audioUrl,
          price: data.price,
          levelN: data.levelN,
          testType: data.testType!, // required on create by the schema
          status: data.status
        },
        meanings: data.meanings,
        questions
      })
      // POST: 201 for both (the status is not switched on update)
      return {
        data: testSet,
        message: this.i18nService.translate(
          isUpdate ? M.UPDATE_SUCCESS : M.CREATE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      throw this.toTestSetError(error)
    }
  }

  //#region helpers
  private async loadTestSet(id: number): Promise<TestSetType> {
    const testSet = await this.testSetRepo.findById(id)
    if (!testSet) throw new TestSetNotFoundException()
    return testSet
  }

  // Once a test set has questions:
  // - level: only a GENERAL one may change it, or a change to/from 0 (several)
  // - type: a specific type may become GENERAL; a GENERAL one may become the
  //   single type of its questions (never when they have several types)
  private async assertChangeAllowed(
    testSet: TestSetType,
    data: { levelN?: number | null; testType?: PrismaTestSetType }
  ) {
    const levelChanges = data.levelN !== undefined && data.levelN !== testSet.levelN
    const typeChanges = !!data.testType && data.testType !== testSet.testType
    if (!levelChanges && !typeChanges) return

    const types = await this.testSetRepo.questionTypesOf(testSet.id)
    if (types.length === 0) return

    if (
      levelChanges &&
      testSet.testType !== GENERAL &&
      data.levelN !== 0 &&
      testSet.levelN !== 0
    ) {
      throw new TestSetChangeNotAllowedException(M.CANNOT_CHANGE_LEVEL_HAS_QUESTIONS)
    }
    if (!typeChanges) return

    const from = testSet.testType
    const to = data.testType!
    const distinct = [...new Set(types)]
    if (from === GENERAL && distinct.length > 1) {
      throw new TestSetChangeNotAllowedException(M.CANNOT_CHANGE_TYPE_GENERAL_MULTIPLE)
    }
    if (from !== GENERAL && to !== GENERAL) {
      throw new TestSetChangeNotAllowedException(M.CANNOT_CHANGE_TYPE_SPECIFIC, {
        from,
        to
      })
    }
    if (from === GENERAL && String(to) !== String(distinct[0])) {
      throw new TestSetChangeNotAllowedException(M.CANNOT_CHANGE_TYPE_GENERAL_SINGLE, {
        questionType: distinct[0]
      })
    }
  }

  // New audio for an edited LISTENING/SPEAKING question (undefined = keep)
  private async regeneratedAudio(q: UpsertQuestionBankType) {
    if (
      q.questionType !== QuestionType.SPEAKING &&
      q.questionType !== QuestionType.LISTENING
    ) {
      return undefined
    }
    return this.textToSpeechService.generateAudioFromText(
      q.questionJp,
      'question-bank',
      'question_bank'
    )
  }

  // createWithMeanings makes the speech for LISTENING/SPEAKING without audio;
  // SPEAKING questions may repeat questionJp
  private async createQuestionBank(q: UpsertQuestionBankType, userId: number) {
    const result = await this.questionBankService.createWithMeanings(
      {
        questionJp: q.questionJp,
        questionType: q.questionType,
        audioUrl: q.audioUrl?.trim() ? q.audioUrl : null,
        pronunciation: q.pronunciation || null,
        role: q.role || null,
        levelN: q.levelN || null,
        meanings: q.meanings || [],
        questionKey: null
      },
      userId,
      q.questionType === QuestionType.SPEAKING
    )
    return (result.data as { id: number }).id
  }

  private toTestSetError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'TestSet request failed',
      error instanceof Error ? error.stack : error
    )
    if (isNotFoundPrismaError(error)) return new TestSetNotFoundException()
    return new InvalidTestSetDataException()
  }
  //#endregion
}
