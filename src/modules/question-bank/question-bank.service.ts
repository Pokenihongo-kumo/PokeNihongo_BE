import {
  CreateQuestionBankWithMeaningsBodyType,
  UpdateQuestionBankWithMeaningsBodyType,
  CreateQuestionBankWithAnswersBodyType,
  GetQuestionBankListQueryType,
  lacksPronunciation
} from '@/modules/question-bank/entities/question-bank.entity'
import {
  InvalidQuestionBankDataException,
  NoQuestionBankDeletedException,
  QuestionBankAlreadyExistsException,
  QuestionBankNotFoundException,
  QuestionBankPronunciationRequiredException
} from '@/modules/question-bank/dto/question-bank.error'
import { QuestionBankRepo } from '@/modules/question-bank/question-bank.repo'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import { QuestionType } from '@prisma/client'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { AnswerService } from '@/modules/answer/answer.service'
import { I18nService } from '@/i18n/i18n.service'
import { QuestionBankMessage as M } from '@/i18n/message-keys'
import { toPaginationMeta } from '@/shared/utils/pagination'
import {
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'

const blankToNull = (value: string | null | undefined) =>
  value === undefined ? undefined : value?.trim() ? value : null

const SPOKEN: QuestionType[] = [QuestionType.LISTENING, QuestionType.SPEAKING]

@Injectable()
export class QuestionBankService {
  private readonly logger = new Logger(QuestionBankService.name)

  constructor(
    private readonly questionBankRepo: QuestionBankRepo,
    private readonly textToSpeechService: TextToSpeechService,
    private readonly answerService: AnswerService,
    private readonly i18nService: I18nService
  ) {}

  // Used by the testset upsert (no route). SPEAKING questions may repeat
  // questionJp there (skipDuplicateCheck)
  async createWithMeanings(
    body: CreateQuestionBankWithMeaningsBodyType,
    userId: number,
    skipDuplicateCheck: boolean = false,
    lang: string = 'vi'
  ) {
    try {
      if (lacksPronunciation(body)) throw new QuestionBankPronunciationRequiredException()
      if (!skipDuplicateCheck) await this.assertQuestionJpFree(body.questionJp)
      const questionBank = await this.questionBankRepo.createWithMeanings(
        { ...body, audioUrl: await this.audioFor(body) },
        userId
      )
      return {
        statusCode: 201,
        data: questionBank,
        message: this.i18nService.translate(M.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toQuestionBankError(error)
    }
  }

  // The question, then each answer on its own (failures are reported).
  // statusCode: 201 all answers, 207 some, 400 none (the question stays)
  async createWithAnswers(
    body: CreateQuestionBankWithAnswersBodyType,
    userId: number,
    lang: string = 'vi'
  ) {
    let questionBank
    try {
      await this.assertQuestionJpFree(body.questionJp)
      const { answers: _answers, ...question } = body
      questionBank = await this.questionBankRepo.createWithMeanings(
        { ...question, audioUrl: await this.audioFor(body) },
        userId
      )
    } catch (error) {
      throw this.toQuestionBankError(error)
    }

    const answers: unknown[] = []
    const failedAnswers: { answerJp: string; reason: string }[] = []
    for (const answer of body.answers) {
      try {
        const created = await this.answerService.createAnswer(
          { ...answer, questionBankId: questionBank.id },
          lang
        )
        answers.push(created.data)
      } catch (error) {
        failedAnswers.push({
          answerJp: answer.answerJp,
          reason: this.answerService.failureReason(error, lang)
        })
      }
    }

    const total = body.answers.length
    const counts = { created: answers.length, total }
    const [statusCode, key] =
      answers.length === 0
        ? [400, M.WITH_ANSWERS_NONE]
        : failedAnswers.length > 0
          ? [207, M.WITH_ANSWERS_PARTIAL]
          : [201, M.WITH_ANSWERS_CREATED]
    return {
      statusCode,
      data: {
        questionBank,
        answers,
        createdCount: answers.length,
        failedCount: failedAnswers.length,
        failedAnswers: failedAnswers.length > 0 ? failedAnswers : undefined
      },
      message: this.i18nService.translate(key, lang, counts)
    }
  }

  async findAll(query: GetQuestionBankListQueryType, lang: string = 'vi') {
    const [{ data, total }, levelCounts] = await Promise.all([
      this.questionBankRepo.findMany(query),
      this.questionBankRepo.countByLevelN(query)
    ])
    return {
      statusCode: 200,
      data: {
        results: data,
        pagination: toPaginationMeta(query.currentPage, query.pageSize, total),
        levelCounts
      },
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang)
    }
  }

  // Also used by testset-questionbank (reads data.answers)
  async findOne(id: number, lang: string = 'vi') {
    const questionBank = await this.questionBankRepo.findById(id)
    if (!questionBank) throw new QuestionBankNotFoundException()
    return {
      statusCode: 200,
      data: questionBank,
      message: this.i18nService.translate(M.GET_SUCCESS, lang)
    }
  }

  async findByIds(ids: number[], lang: string = 'vi') {
    const questionBanks = await this.questionBankRepo.findByIds(ids, lang)
    return {
      statusCode: 200,
      data: {
        results: questionBanks,
        pagination: toPaginationMeta(1, questionBanks.length || 1, questionBanks.length)
      },
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang)
    }
  }

  // Used by user-exercise-attempt (reads data.results)
  async findByTestSetId(testSetId: number, lang: string = 'vi') {
    const questionBanks = await this.questionBankRepo.findByTestSetId(testSetId)
    return {
      statusCode: 200,
      data: { results: questionBanks },
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang)
    }
  }

  async updateWithMeanings(
    id: number,
    body: UpdateQuestionBankWithMeaningsBodyType,
    lang: string = 'vi'
  ) {
    try {
      const current = await this.questionBankRepo.findById(id)
      if (!current) throw new QuestionBankNotFoundException()
      if (body.questionJp && body.questionJp !== current.questionJp) {
        await this.assertQuestionJpFree(body.questionJp, id)
      }
      // New speech only when the request itself sends LISTENING/SPEAKING and questionJp
      const audioUrl = body.questionJp
        ? await this.audioFor({ ...body, questionJp: body.questionJp })
        : blankToNull(body.audioUrl)
      const questionBank = await this.questionBankRepo.updateWithMeanings(id, {
        ...body,
        audioUrl
      })
      return {
        statusCode: 200,
        data: questionBank,
        message: this.i18nService.translate(M.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toQuestionBankError(error)
    }
  }

  // Also deletes its meanings (only the bulk delete did)
  async remove(id: number, lang: string = 'vi') {
    const questionBank = await this.questionBankRepo.delete(id)
    if (!questionBank) throw new QuestionBankNotFoundException()
    return {
      statusCode: 200,
      data: questionBank,
      message: this.i18nService.translate(M.DELETE_SUCCESS, lang)
    }
  }

  // Ids that do not exist are skipped; 404 when none does
  async removeMany(ids: number[], lang: string = 'vi') {
    const { deletedCount, deletedIds } = await this.questionBankRepo.deleteMany(ids)
    if (deletedCount === 0) throw new NoQuestionBankDeletedException()
    return {
      statusCode: 200,
      data: {
        deletedCount,
        deletedIds,
        requestedCount: ids.length,
        notFoundCount: ids.length - deletedCount
      },
      message: this.i18nService.translate(M.DELETE_MANY_SUCCESS, lang, {
        deleted: deletedCount,
        requested: ids.length
      })
    }
  }

  //#region helpers
  private async assertQuestionJpFree(questionJp: string, excludeId?: number) {
    if (await this.questionBankRepo.questionJpTaken(questionJp, excludeId)) {
      throw new QuestionBankAlreadyExistsException()
    }
  }

  // LISTENING/SPEAKING without an audio URL get speech made from questionJp;
  // '' is stored as null (it failed the response's URL check)
  private async audioFor(body: {
    questionType?: QuestionType
    questionJp: string
    audioUrl?: string | null
  }): Promise<string | null | undefined> {
    if (
      body.questionType &&
      SPOKEN.includes(body.questionType) &&
      !body.audioUrl?.trim()
    ) {
      return this.textToSpeechService.generateAudioFromText(
        body.questionJp,
        'question-bank',
        'question_bank'
      )
    }
    return blankToNull(body.audioUrl)
  }

  private toQuestionBankError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'QuestionBank request failed',
      error instanceof Error ? error.stack : error
    )
    if (isUniqueConstraintPrismaError(error))
      return new QuestionBankAlreadyExistsException()
    if (isNotFoundPrismaError(error)) return new QuestionBankNotFoundException()
    return new InvalidQuestionBankDataException()
  }
  //#endregion
}
