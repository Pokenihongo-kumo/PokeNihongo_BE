import { TextToSpeechService } from '@/modules/speech/text-to-speech.service'
import { I18nService } from '@/i18n/i18n.service'
import { QuestionBankMessage as M } from '@/i18n/message-keys'
import { AnswerService } from '@/modules/answer/answer.service'
import { toPaginationMeta } from '@/shared/utils/pagination'
import {
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import { QuestionType } from '@prisma/client'
import {
  InvalidQuestionBankDataException,
  NoQuestionBankDeletedException,
  QuestionBankAlreadyExistsException,
  QuestionBankNotFoundException,
  QuestionBankPronunciationRequiredException
} from './dto/question-bank.error'
import {
  CreateQuestionBankWithAnswersBody,
  CreateQuestionBankWithMeaningsBody,
  GetQuestionBankListQuery,
  UpdateQuestionBankWithMeaningsBody
} from './dto/question-bank.zod-dto'
import { lacksPronunciation } from './entities/question-bank.entity'
import { QuestionBankRepo } from './question-bank.repo'

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
    body: CreateQuestionBankWithMeaningsBody,
    userId: number,
    skipDuplicateCheck: boolean = false
  ) {
    try {
      if (lacksPronunciation(body)) throw new QuestionBankPronunciationRequiredException()
      if (!skipDuplicateCheck) await this.assertQuestionJpFree(body.questionJp)
      const questionBank = await this.questionBankRepo.createWithMeanings(
        { ...body, audioUrl: await this.audioFor(body) },
        userId
      )
      return questionBank
    } catch (error) {
      throw this.toQuestionBankError(error)
    }
  }

  // The question, then each answer on its own (failures are reported, their
  // reason in `lang`). The controller answers 201 all answers, 207 some, 400 none
  // (the question stays)
  async createWithAnswers(
    body: CreateQuestionBankWithAnswersBody,
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
        const created = await this.answerService.createAnswer({
          ...answer,
          questionBankId: questionBank.id
        })
        answers.push(created)
      } catch (error) {
        failedAnswers.push({
          answerJp: answer.answerJp,
          reason: this.answerService.failureReason(error, lang)
        })
      }
    }

    return {
      questionBank,
      answers,
      createdCount: answers.length,
      failedCount: failedAnswers.length,
      failedAnswers: failedAnswers.length > 0 ? failedAnswers : undefined
    }
  }

  async findAll(query: GetQuestionBankListQuery) {
    const [{ data, total }, levelCounts] = await Promise.all([
      this.questionBankRepo.findMany(query),
      this.questionBankRepo.countByLevelN(query)
    ])
    return {
      results: data,
      pagination: toPaginationMeta(query.currentPage, query.pageSize, total),
      levelCounts
    }
  }

  // Also used by testset-questionbank (reads data.answers)
  async findOne(id: number) {
    const questionBank = await this.questionBankRepo.findById(id)
    if (!questionBank) throw new QuestionBankNotFoundException()
    return questionBank
  }

  async findByIds(ids: number[], lang: string = 'vi') {
    const questionBanks = await this.questionBankRepo.findByIds(ids, lang)
    return {
      results: questionBanks,
      pagination: toPaginationMeta(1, questionBanks.length || 1, questionBanks.length)
    }
  }

  // Used by user-exercise-attempt (reads data.results)
  async findByTestSetId(testSetId: number) {
    const questionBanks = await this.questionBankRepo.findByTestSetId(testSetId)
    return { results: questionBanks }
  }

  async updateWithMeanings(id: number, body: UpdateQuestionBankWithMeaningsBody) {
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
      return questionBank
    } catch (error) {
      throw this.toQuestionBankError(error)
    }
  }

  // Also deletes its meanings (only the bulk delete did)
  async remove(id: number) {
    const questionBank = await this.questionBankRepo.delete(id)
    if (!questionBank) throw new QuestionBankNotFoundException()
    return questionBank
  }

  // Ids that do not exist are skipped; 404 when none does
  async removeMany(ids: number[]) {
    const { deletedCount, deletedIds } = await this.questionBankRepo.deleteMany(ids)
    if (deletedCount === 0) throw new NoQuestionBankDeletedException()
    return {
      deletedCount,
      deletedIds,
      requestedCount: ids.length,
      notFoundCount: ids.length - deletedCount
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

  // ---- For other modules (module-boundary plan B6) ----
  // Same arguments and results as the repo methods.

  getRandomQuestions(...args: Parameters<QuestionBankRepo['getRandomQuestions']>) {
    return this.questionBankRepo.getRandomQuestions(...args)
  }

  // The repo's findByIds (the service's own findByIds answers the HTTP route)
  getByIds(...args: Parameters<QuestionBankRepo['findByIds']>) {
    return this.questionBankRepo.findByIds(...args)
  }
}
