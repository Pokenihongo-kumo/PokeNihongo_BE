import { toPaginationMeta } from '@/shared/utils/pagination'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import {
  InvalidTranslationDataException,
  TranslationAlreadyExistsException,
  TranslationLanguageNotFoundException,
  TranslationNotFoundException
} from './dto/translation.error'
import {
  CreateTranslationBody,
  GetTranslationListQuery,
  GetTranslationsByKeyQuery,
  GetTranslationsByLanguageQuery,
  UpdateTranslationBody
} from './dto/translation.zod-dto'
import { Translation } from './entities/translation.entity'
import { TranslationRepo } from './translation.repo'

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name)

  constructor(private readonly translationRepository: TranslationRepo) {}

  //#region HTTP routes (envelope + translated message)
  async findMany(params: GetTranslationListQuery) {
    const result = await this.translationRepository.findMany(params)
    return {
      results: result.data,
      pagination: toPaginationMeta(params.page, params.limit, result.total)
    }
  }

  // { results, pagination } like every list (was { data[], total, page, limit, totalPages })
  async findByLanguage(params: GetTranslationsByLanguageQuery) {
    const result = await this.translationRepository.findByLanguage(params.languageId, {
      page: params.page,
      limit: params.limit
    })
    return {
      results: result.data,
      pagination: toPaginationMeta(params.page, params.limit, result.total)
    }
  }

  async getByKey(params: GetTranslationsByKeyQuery) {
    return await this.findByKey(params)
  }

  async getById(id: number) {
    return await this.findById(id)
  }

  async createTranslation(data: CreateTranslationBody) {
    return await this.create(data)
  }

  async createTranslations(data: CreateTranslationBody[]) {
    return await this.createMany(data)
  }

  async updateTranslation(id: number, data: UpdateTranslationBody) {
    return await this.update(id, data)
  }
  //#endregion

  //#region Used by other modules too (plain data, unchanged shapes)
  async findById(id: number): Promise<Translation> {
    const translation = await this.translationRepository.findById(id)
    if (!translation) {
      throw new TranslationNotFoundException()
    }
    return translation
  }

  async findByKeyAndLanguage(
    key: string,
    languageId: number
  ): Promise<Translation | null> {
    if (!key || key.trim() === '') {
      this.logger.warn(`Translation key is empty or undefined: ${key}`)
      return null
    }
    return this.translationRepository.findByKeyAndLanguage(key, languageId)
  }

  async findByKeyOrMeaningPrefix(
    key: string,
    languageId: number
  ): Promise<Translation[]> {
    if (!key || key.trim() === '') {
      this.logger.warn(`Translation key is empty or undefined: ${key}`)
      return []
    }
    return this.translationRepository.findByKeyOrMeaningPrefix(key, languageId)
  }

  async resolvePreferredTranslationValue(
    key: string,
    languageId: number
  ): Promise<string | null> {
    const translations = await this.findByKeyOrMeaningPrefix(key, languageId)
    if (!translations.length) {
      return null
    }

    const meaningTranslation = translations.find((t) =>
      t.key.startsWith(`${key}.meaning.`)
    )
    const directTranslation = translations.find((t) => t.key === key)

    return meaningTranslation?.value || directTranslation?.value || null
  }

  async findByKey(params: GetTranslationsByKeyQuery) {
    const translations = await this.translationRepository.findByKey(params.key)
    return { key: params.key, translations }
  }

  async create(data: CreateTranslationBody): Promise<Translation> {
    try {
      if (
        await this.translationRepository.findByKeyAndLanguage(data.key, data.languageId)
      ) {
        throw new TranslationAlreadyExistsException()
      }
      return await this.translationRepository.create(data)
    } catch (error) {
      throw this.toTranslationError(error)
    }
  }

  async createMany(data: CreateTranslationBody[]): Promise<{ count: number }> {
    try {
      for (const item of data) {
        if (
          await this.translationRepository.findByKeyAndLanguage(item.key, item.languageId)
        ) {
          throw new TranslationAlreadyExistsException()
        }
      }
      return await this.translationRepository.createMany(data)
    } catch (error) {
      throw this.toTranslationError(error)
    }
  }

  async update(id: number, data: UpdateTranslationBody): Promise<Translation> {
    try {
      const existing = await this.translationRepository.findById(id)
      if (!existing) {
        throw new TranslationNotFoundException()
      }

      // Changing key or language must not collide with another row
      if (
        (data.key && data.key !== existing.key) ||
        (data.languageId && data.languageId !== existing.languageId)
      ) {
        const duplicate = await this.translationRepository.findByKeyAndLanguage(
          data.key || existing.key,
          data.languageId || existing.languageId
        )
        if (duplicate && duplicate.id !== id) {
          throw new TranslationAlreadyExistsException()
        }
      }

      return await this.translationRepository.update(id, data)
    } catch (error) {
      throw this.toTranslationError(error)
    }
  }

  async updateByKeyAndLanguage(
    key: string,
    languageId: number,
    data: UpdateTranslationBody
  ): Promise<Translation> {
    try {
      if (!(await this.translationRepository.findByKeyAndLanguage(key, languageId))) {
        throw new TranslationNotFoundException()
      }
      return await this.translationRepository.updateByKeyAndLanguage(
        key,
        languageId,
        data
      )
    } catch (error) {
      throw this.toTranslationError(error)
    }
  }

  async delete(id: number): Promise<void> {
    try {
      if (!(await this.translationRepository.findById(id))) {
        throw new TranslationNotFoundException()
      }
      await this.translationRepository.delete(id)
    } catch (error) {
      throw this.toTranslationError(error)
    }
  }

  async deleteByKeyAndLanguage(key: string, languageId: number): Promise<void> {
    try {
      if (!(await this.translationRepository.findByKeyAndLanguage(key, languageId))) {
        throw new TranslationNotFoundException()
      }
      await this.translationRepository.deleteByKeyAndLanguage(key, languageId)
    } catch (error) {
      throw this.toTranslationError(error)
    }
  }

  // prismaTx: the caller's transaction (other modules delete a key inside theirs)
  async deleteByKey(key: string, prismaTx?: PrismaClient): Promise<{ count: number }> {
    try {
      return await this.translationRepository.deleteByKey(key, prismaTx)
    } catch (error) {
      throw this.toTranslationError(error)
    }
  }
  //#endregion

  /**
   * Error to answer, decided by type (not message text): our HTTP errors pass
   * through (they were all turned into 400 before), duplicate (languageId, key)
   * is 409, a missing language 404, a missing row 404, anything else the
   * generic "invalid data" 400 these methods answered before.
   */
  private toTranslationError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'Translation request failed',
      error instanceof Error ? error.stack : error
    )
    if (isUniqueConstraintPrismaError(error))
      return new TranslationAlreadyExistsException()
    if (isForeignKeyConstraintPrismaError(error)) {
      return new TranslationLanguageNotFoundException()
    }
    if (isNotFoundPrismaError(error)) return new TranslationNotFoundException()
    return new InvalidTranslationDataException()
  }

  // ---- For other modules (module-boundary plan R1/R2) ----
  // Pass-throughs with the repo's signatures; a caller's transaction client is
  // used when given, so nothing moves out of its transaction (rule R3).

  validateTranslationRecords(translationRecords: CreateTranslationBody[]) {
    return this.translationRepository.validateTranslationRecords(translationRecords)
  }

  createOrUpdateWithTransaction(
    data: { languageId: number; key: string; value: string },
    prismaTx?: PrismaClient
  ) {
    return this.translationRepository.createOrUpdateWithTransaction(data, prismaTx)
  }

  findByKeysAndLanguage(keys: string[], languageId: number) {
    return this.translationRepository.findByKeysAndLanguage(keys, languageId)
  }

  // ---- For other modules: A vocabulary's meaning translations (optional tx) (B7) ----

  findVocabularyMeaningTranslations(
    ...args: Parameters<TranslationRepo['findVocabularyMeaningTranslations']>
  ) {
    return this.translationRepository.findVocabularyMeaningTranslations(...args)
  }

  createManySkippingDuplicates(
    ...args: Parameters<TranslationRepo['createManySkippingDuplicates']>
  ) {
    return this.translationRepository.createManySkippingDuplicates(...args)
  }

  findVocabularyMeaningWithValue(
    ...args: Parameters<TranslationRepo['findVocabularyMeaningWithValue']>
  ) {
    return this.translationRepository.findVocabularyMeaningWithValue(...args)
  }
}
