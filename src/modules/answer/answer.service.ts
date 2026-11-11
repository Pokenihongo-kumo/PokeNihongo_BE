import { I18nService } from '@/i18n/i18n.service'
import { AnswerMessage } from '@/i18n/message-keys'
import { LanguagesRepo } from '@/modules/languages/languages.repo'
import { TranslationService } from '@/modules/translation/translation.service'
import { toPaginationMeta } from '@/shared/utils/pagination'
import {
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import { Answer, QuestionType } from '@prisma/client'
import { AnswerRepo } from './answer.repo'
import {
  AnswerAlreadyExistsException,
  AnswerContentAlreadyExistsException,
  AnswerNotFoundException,
  AnswerRule,
  AnswerRuleViolationException,
  InvalidAnswerDataException,
  QuestionNotFoundException
} from './dto/answer.error'
import {
  CreateAnswerBodyType,
  CreateMultipleAnswersBodyType,
  GetAnswerListQueryType,
  UpdateAnswerBodyType
} from './entities/answer.entity'

type TranslationInput = { language_code: string; value: string }
type AnswerTranslations = CreateAnswerBodyType['translations']
type Translate = (key: string, args?: Record<string, string | number>) => string
// Language ids by code and codes by id, read from the Languages table
// (they were hard-coded as vi=1, en=2, ja=3)
type LanguageMaps = { idByCode: Map<string, number>; codeById: Map<number, string> }

const LANGUAGE_CODES = ['vi', 'en', 'ja']
const MAX_ANSWERS = 4

@Injectable()
export class AnswerService {
  private readonly logger = new Logger(AnswerService.name)

  constructor(
    private readonly answerRepository: AnswerRepo,
    private readonly translationService: TranslationService,
    private readonly languagesRepo: LanguagesRepo,
    private readonly i18nService: I18nService
  ) {}

  //#region Get Answer
  // `language` (query) picks one meaning per answer; without it, all meanings
  async getAnswerList(params: GetAnswerListQueryType, lang: string = 'vi') {
    const result = await this.answerRepository.findMany(params)
    const languages = await this.languageMaps()
    const languageId = params.language
      ? languages.idByCode.get(params.language)
      : undefined

    const results = await Promise.all(
      result.items.map(async ({ answerKey, ...answer }) => {
        const parsed = this.parsedFields(answer.answerJp)
        if (languageId) {
          const meaning = answerKey
            ? await this.safely(
                async () =>
                  (
                    await this.translationService.findByKeyAndLanguage(
                      answerKey,
                      languageId
                    )
                  )?.value ||
                  answer.answerJp ||
                  '',
                ''
              )
            : answer.answerJp || ''
          return { ...answer, meaning, ...parsed }
        }
        const meanings = answerKey
          ? await this.safely(
              async () =>
                (
                  await this.translationService.findByKey({ key: answerKey })
                ).translations.map((t) => ({
                  language: languages.codeById.get(t.languageId) ?? null,
                  value: t.value
                })),
              []
            )
          : []
        return { ...answer, meanings, ...parsed }
      })
    )

    return {
      statusCode: 200,
      message: this.i18nService.translate(AnswerMessage.GET_LIST_SUCCESS, lang),
      data: {
        results,
        pagination: toPaginationMeta(params.currentPage, params.pageSize, result.total)
      }
    }
  }

  async getAnswerById(id: number, lang: string = 'vi') {
    try {
      const found = await this.answerRepository.findById(id)
      if (!found) {
        throw new AnswerNotFoundException()
      }
      const { answerKey, ...answer } = found
      const languages = await this.languageMaps()

      // Meaning in the request language, else the Japanese text
      const languageId = languages.idByCode.get(lang)
      const meaning =
        answerKey && languageId
          ? await this.safely(
              async () =>
                (
                  await this.translationService.findByKeyAndLanguage(
                    answerKey,
                    languageId
                  )
                )?.value ??
                answer.answerJp ??
                '',
              answer.answerJp ?? ''
            )
          : (answer.answerJp ?? '')
      const meanings = answerKey ? await this.translationsOf(answerKey, languages) : []

      return {
        statusCode: 200,
        data: {
          ...answer,
          meaning,
          ...(meanings.length > 0 ? { meanings } : {}),
          ...this.parsedFields(answer.answerJp)
        },
        message: this.i18nService.translate(AnswerMessage.GET_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toAnswerError(error)
    }
  }
  //#endregion

  //#region Create Answer (also used by question-bank)
  async createAnswer(data: CreateAnswerBodyType, lang: string = 'vi') {
    try {
      if (!(await this.answerRepository.checkQuestionExists(data.questionBankId))) {
        throw new QuestionNotFoundException()
      }
      const rule = await this.brokenNewAnswerRule(data.questionBankId, data.isCorrect)
      if (rule) {
        throw new AnswerRuleViolationException(rule)
      }
      if (
        await this.answerRepository.checkAnswerExists(data.questionBankId, data.answerJp)
      ) {
        throw new AnswerContentAlreadyExistsException()
      }

      const { translations, ...answerData } = data
      const answer = await this.createWithKey(answerData)
      const languages = await this.languageMaps()
      await this.safely(
        () => this.writeTranslations(answer, translations, languages),
        undefined
      )

      return {
        statusCode: 201,
        data: await this.withTranslations(answer.id, languages),
        message: this.i18nService.translate(AnswerMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toAnswerError(error)
    }
  }
  //#endregion

  //#region Update Answer
  async updateAnswer(id: number, data: UpdateAnswerBodyType, lang: string = 'vi') {
    try {
      if (!(await this.answerRepository.findById(id))) {
        throw new AnswerNotFoundException()
      }
      if (
        data.questionBankId &&
        !(await this.answerRepository.checkQuestionExists(data.questionBankId))
      ) {
        throw new QuestionNotFoundException()
      }

      const { translations, ...fields } = data
      const updated = await this.answerRepository.update(id, fields)

      // The key follows the id; a changed text re-points it there
      let answerKey = updated.answerKey || `answer.${id}.text`
      if (data.answerJp) {
        answerKey = `answer.${id}.text`
        await this.answerRepository.updateAnswerKey(id, answerKey)
      }
      if (translations && 'meaning' in translations) {
        await this.upsertTranslations(
          answerKey,
          translations.meaning,
          await this.languageMaps()
        )
      }

      return {
        statusCode: 200,
        data: { ...updated, answerKey },
        message: this.i18nService.translate(AnswerMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toAnswerError(error)
    }
  }
  //#endregion

  //#region Delete Answer
  async deleteAnswer(id: number, lang: string = 'vi') {
    try {
      if (!(await this.answerRepository.findById(id))) {
        throw new AnswerNotFoundException()
      }
      await this.answerRepository.delete(id)
      return {
        statusCode: 204,
        message: this.i18nService.translate(AnswerMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toAnswerError(error)
    }
  }
  //#endregion

  //#region Create or update several answers of one question
  /**
   * With `id`: updates that answer (its text may change); without: upserts by
   * answerJp. Answers that break a rule are reported in `failed`, the rest are
   * saved. statusCode: 201 created only, 200 with updates, 207 some failed,
   * 400 none saved.
   */
  async createMultiple(data: CreateMultipleAnswersBodyType, lang: string = 'vi') {
    try {
      if (!(await this.answerRepository.checkQuestionExists(data.questionBankId))) {
        throw new QuestionNotFoundException()
      }
      const questionType = await this.answerRepository.getQuestionType(
        data.questionBankId
      )
      const languages = await this.languageMaps()
      const t: Translate = (key, args) => this.i18nService.translate(key, lang, args)

      const createdAnswers: Answer[] = []
      const updatedAnswers: Answer[] = []
      const failedAnswers: { answerJp: string; reason: string }[] = []
      const fail = (answerJp: string, reason: string) => {
        failedAnswers.push({ answerJp, reason })
      }

      for (const answerData of data.answers) {
        try {
          let existing: Answer | null
          const isUpdateById = !!answerData.id

          if (answerData.id) {
            existing = await this.answerRepository.findById(answerData.id)
            if (!existing) {
              fail(
                answerData.answerJp,
                t(AnswerMessage.ANSWER_ID_NOT_FOUND, { id: answerData.id })
              )
              continue
            }
            if (existing.questionBankId !== data.questionBankId) {
              fail(
                answerData.answerJp,
                t(AnswerMessage.ANSWER_OF_OTHER_QUESTION, {
                  id: answerData.id,
                  questionBankId: existing.questionBankId
                })
              )
              continue
            }
          } else {
            existing = await this.answerRepository.checkAnswerExists(
              data.questionBankId,
              answerData.answerJp
            )
          }

          if (existing) {
            // UPDATE
            const rule = await this.brokenUpdateRule(
              data.questionBankId,
              questionType,
              existing.isCorrect,
              answerData.isCorrect
            )
            if (rule) {
              fail(answerData.answerJp, t(rule))
              continue
            }

            // By id the text may change, unless another answer already has it
            const textChanged = isUpdateById && answerData.answerJp !== existing.answerJp
            if (textChanged) {
              const conflict = await this.answerRepository.checkAnswerExists(
                data.questionBankId,
                answerData.answerJp,
                existing.id
              )
              if (conflict) {
                fail(
                  answerData.answerJp,
                  t(AnswerMessage.ANSWER_TEXT_TAKEN, {
                    answerJp: answerData.answerJp,
                    id: conflict.id
                  })
                )
                continue
              }
            }

            const updated = await this.answerRepository.update(existing.id, {
              isCorrect: answerData.isCorrect,
              ...(isUpdateById && { answerJp: answerData.answerJp })
            })
            let answerKey = updated.answerKey || `answer.${updated.id}.text`
            if (textChanged) {
              answerKey = `answer.${updated.id}.text`
              await this.answerRepository.updateAnswerKey(updated.id, answerKey)
            }
            if (answerData.translations && 'meaning' in answerData.translations) {
              await this.upsertTranslations(
                answerKey,
                answerData.translations.meaning,
                languages
              )
            }

            const saved = await this.answerRepository.findById(updated.id)
            if (saved) updatedAnswers.push(saved)
          } else {
            // CREATE
            const rule = await this.brokenNewAnswerRule(
              data.questionBankId,
              answerData.isCorrect,
              questionType
            )
            if (rule) {
              fail(answerData.answerJp, t(rule))
              continue
            }

            const { id: _id, translations, ...fields } = answerData
            const answer = await this.createWithKey({
              ...fields,
              questionBankId: data.questionBankId
            })
            const hasMeanings =
              translations && 'meaning' in translations && translations.meaning.length > 0
            if (hasMeanings) {
              await this.writeTranslations(answer, translations, languages)
            } else {
              // Default vi translation; its failure does not fail the answer
              await this.safely(
                () => this.writeTranslations(answer, undefined, languages),
                undefined
              )
            }

            const saved = await this.answerRepository.findById(answer.id)
            if (saved) createdAnswers.push(saved)
          }
        } catch (error) {
          this.logger.error(`Error processing answer "${answerData.answerJp}"`, error)
          fail(answerData.answerJp, this.failureReason(error, lang))
        }
      }

      const total = data.answers.length
      const created = createdAnswers.length
      const updated = updatedAnswers.length
      const failed = failedAnswers.length
      const { statusCode, message } = this.summaryOf(created, updated, failed, t)

      return {
        statusCode,
        data: {
          created: createdAnswers,
          updated: updatedAnswers,
          failed: failedAnswers,
          summary: { total, created, updated, failed }
        },
        message
      }
    } catch (error) {
      throw this.toAnswerError(error)
    }
  }
  //#endregion

  //#region Helpers
  private summaryOf(
    created: number,
    updated: number,
    failed: number,
    t: Translate
  ): { statusCode: number; message: string } {
    if (created + updated === 0) {
      return { statusCode: 400, message: t(AnswerMessage.MULTIPLE_NONE_SAVED) }
    }
    if (failed > 0) {
      const key =
        created > 0 && updated > 0
          ? AnswerMessage.MULTIPLE_CREATED_UPDATED_FAILED
          : created > 0
            ? AnswerMessage.MULTIPLE_CREATED_FAILED
            : AnswerMessage.MULTIPLE_UPDATED_FAILED
      return { statusCode: 207, message: t(key, { created, updated, failed }) }
    }
    if (updated > 0) {
      return {
        statusCode: 200,
        message: t(AnswerMessage.MULTIPLE_CREATED_UPDATED, { created, updated })
      }
    }
    return { statusCode: 201, message: t(AnswerMessage.MULTIPLE_CREATED, { created }) }
  }

  // MATCHING: a single answer, which must be correct; others: at most 4, one correct
  private async brokenNewAnswerRule(
    questionBankId: number,
    isCorrect: boolean,
    knownType?: QuestionType | null
  ): Promise<AnswerRule | null> {
    const questionType =
      knownType ?? (await this.answerRepository.getQuestionType(questionBankId))
    const count = await this.answerRepository.countAnswersByQuestionId(questionBankId)
    if (questionType === QuestionType.MATCHING) {
      if (count >= 1) return AnswerMessage.MATCHING_SINGLE_ANSWER
      if (!isCorrect) return AnswerMessage.MATCHING_MUST_BE_CORRECT
      return null
    }
    if (count >= MAX_ANSWERS) return AnswerMessage.MAX_ANSWERS_REACHED
    if (isCorrect && (await this.answerRepository.hasCorrectAnswer(questionBankId))) {
      return AnswerMessage.CORRECT_ANSWER_EXISTS
    }
    return null
  }

  private async brokenUpdateRule(
    questionBankId: number,
    questionType: QuestionType | null,
    wasCorrect: boolean,
    isCorrect: boolean
  ): Promise<AnswerRule | null> {
    if (questionType === QuestionType.MATCHING) {
      return isCorrect ? null : AnswerMessage.MATCHING_MUST_BE_CORRECT
    }
    if (
      isCorrect &&
      !wasCorrect &&
      (await this.answerRepository.hasCorrectAnswer(questionBankId))
    ) {
      return AnswerMessage.CORRECT_ANSWER_EXISTS
    }
    return null
  }

  // The key embeds the id, so the row is created first and the key set after
  private async createWithKey(data: {
    answerJp: string
    isCorrect: boolean
    questionBankId: number
  }): Promise<Answer> {
    const answer = await this.answerRepository.create({ ...data, answerKey: 'temp' })
    const answerKey = `answer.${answer.id}.text`
    await this.answerRepository.updateAnswerKey(answer.id, answerKey)
    return { ...answer, answerKey }
  }

  // Given translations, or a default vi one holding the Japanese text
  private async writeTranslations(
    answer: Answer,
    translations: AnswerTranslations,
    languages: LanguageMaps
  ): Promise<void> {
    const key = answer.answerKey as string
    const items: TranslationInput[] = !translations
      ? [{ language_code: 'vi', value: answer.answerJp ?? '' }]
      : 'meaning' in translations
        ? translations.meaning
        : [translations]
    await Promise.all(
      items.map(async (item) => {
        const languageId = languages.idByCode.get(item.language_code)
        if (!languageId) return
        await this.translationService
          .create({ key, languageId, value: item.value })
          .catch((error) =>
            this.logger.warn(
              `Failed to create ${item.language_code} translation for ${key}`,
              error
            )
          )
      })
    )
  }

  private async upsertTranslations(
    key: string,
    items: TranslationInput[],
    languages: LanguageMaps
  ): Promise<void> {
    for (const item of items) {
      const languageId = languages.idByCode.get(item.language_code)
      if (!languageId) continue
      try {
        if (await this.translationService.findByKeyAndLanguage(key, languageId)) {
          await this.translationService.updateByKeyAndLanguage(key, languageId, {
            value: item.value
          })
        } else {
          await this.translationService.create({ key, languageId, value: item.value })
        }
      } catch (error) {
        this.logger.warn(
          `Failed to upsert ${item.language_code} translation for ${key}`,
          error
        )
      }
    }
  }

  private async translationsOf(
    key: string,
    languages: LanguageMaps
  ): Promise<{ language_code: string; value: string }[]> {
    return this.safely(
      async () =>
        (await this.translationService.findByKey({ key })).translations.map((t) => ({
          language_code: languages.codeById.get(t.languageId) ?? '',
          value: t.value ?? ''
        })),
      []
    )
  }

  // Create answer: the row plus `translations.meaning` when it has any
  private async withTranslations(answerId: number, languages: LanguageMaps) {
    const answer = await this.answerRepository.findById(answerId)
    if (!answer) {
      throw new AnswerNotFoundException()
    }
    if (!answer.answerKey) {
      return { ...answer, translations: { answer: [] } }
    }
    const meaning = await this.translationsOf(answer.answerKey, languages)
    return meaning.length > 0 ? { ...answer, translations: { meaning } } : answer
  }

  private async languageMaps(): Promise<LanguageMaps> {
    const rows = await this.languagesRepo.getWithListCode(LANGUAGE_CODES)
    return {
      idByCode: new Map(rows.map((l) => [l.code, l.id])),
      codeById: new Map(rows.map((l) => [l.id, l.code]))
    }
  }

  // A failed translation lookup or write never fails the answer itself
  private async safely<T>(run: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await run()
    } catch (error) {
      this.logger.warn('Answer translation step failed', error)
      return fallback
    }
  }

  // Translated reason for an answer that could not be saved (also used by question-bank)
  failureReason(error: unknown, lang: string = 'vi'): string {
    if (error instanceof HttpException) {
      const response = error.getResponse() as { errorKey?: string }
      if (response?.errorKey) return this.i18nService.translate(response.errorKey, lang)
    }
    return this.i18nService.translate(AnswerMessage.UNKNOWN_FAILURE, lang)
  }

  /** "jp:...+vi:...+en:..." answers also expose answerJp/answerVi/answerEn */
  private parsedFields(raw: string | null) {
    const parsed = this.parseCombinedAnswer(raw || '')
    return parsed
      ? {
          answerVi: parsed.answerVi,
          answerEn: parsed.answerEn,
          answerJp: parsed.answerJp
        }
      : {}
  }

  private parseCombinedAnswer(
    raw: string
  ): { answerJp: string; answerVi?: string; answerEn?: string } | null {
    if (!raw) return null
    const normalized = raw.replace(/\s*\+\s*/g, '+').trim()
    const jpMatch = normalized.match(/(?:^|\b)jp:([^+]+)/i)
    if (!jpMatch) return null
    // capture even when empty: vi:  or en:
    const viMatch = normalized.match(/\+vi:([^+]*)/i)
    const enMatch = normalized.match(/\+en:([^+]*)/i)
    return {
      answerJp: jpMatch[1].trim(),
      answerVi: viMatch ? viMatch[1].trim() : undefined,
      answerEn: enMatch ? enMatch[1].trim() : undefined
    }
  }

  /**
   * Error to answer, decided by type (not message text): our HTTP errors pass
   * through, unique 409, missing row 404, anything else the generic "invalid
   * data" 400 these methods answered before.
   */
  private toAnswerError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'Answer request failed',
      error instanceof Error ? error.stack : error
    )
    if (isUniqueConstraintPrismaError(error)) return new AnswerAlreadyExistsException()
    if (isNotFoundPrismaError(error)) return new AnswerNotFoundException()
    return new InvalidAnswerDataException()
  }
  //#endregion
}
