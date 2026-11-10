import { I18nService } from '@/i18n/i18n.service'
import { TranslationMessage } from '@/i18n/message-keys'
import { toPaginationMeta } from '@/shared/utils/pagination'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import {
  InvalidTranslationDataException,
  TranslationAlreadyExistsException,
  TranslationLanguageNotFoundException,
  TranslationNotFoundException
} from './dto/translation.error'
import {
  CreateTranslationBodyType,
  GetTranslationListQueryType,
  GetTranslationsByKeyQueryType,
  GetTranslationsByLanguageQueryType,
  TranslationType,
  UpdateTranslationBodyType
} from './entities/translation.entity'
import { TranslationRepo } from './translation.repo'

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name)

  constructor(
    private readonly translationRepository: TranslationRepo,
    private readonly i18nService: I18nService
  ) {}

  //#region HTTP routes (envelope + translated message)
  async findMany(params: GetTranslationListQueryType, lang: string = 'vi') {
    const result = await this.translationRepository.findMany(params)
    return {
      statusCode: 200,
      message: this.i18nService.translate(TranslationMessage.GET_LIST_SUCCESS, lang),
      data: {
        results: result.data,
        pagination: toPaginationMeta(params.page, params.limit, result.total)
      }
    }
  }

  // { results, pagination } like every list (was { data[], total, page, limit, totalPages })
  async findByLanguage(params: GetTranslationsByLanguageQueryType, lang: string = 'vi') {
    const result = await this.translationRepository.findByLanguage(params.languageId, {
      page: params.page,
      limit: params.limit
    })
    return {
      statusCode: 200,
      message: this.i18nService.translate(TranslationMessage.GET_LIST_SUCCESS, lang),
      data: {
        results: result.data,
        pagination: toPaginationMeta(params.page, params.limit, result.total)
      }
    }
  }

  async getByKey(params: GetTranslationsByKeyQueryType, lang: string = 'vi') {
    return {
      data: await this.findByKey(params),
      message: this.i18nService.translate(TranslationMessage.GET_SUCCESS, lang)
    }
  }

  async getById(id: number, lang: string = 'vi') {
    return {
      data: await this.findById(id),
      message: this.i18nService.translate(TranslationMessage.GET_SUCCESS, lang)
    }
  }

  async createTranslation(data: CreateTranslationBodyType, lang: string = 'vi') {
    return {
      data: await this.create(data),
      message: this.i18nService.translate(TranslationMessage.CREATE_SUCCESS, lang)
    }
  }

  async createTranslations(data: CreateTranslationBodyType[], lang: string = 'vi') {
    return {
      data: await this.createMany(data),
      message: this.i18nService.translate(TranslationMessage.CREATE_SUCCESS, lang)
    }
  }

  async updateTranslation(
    id: number,
    data: UpdateTranslationBodyType,
    lang: string = 'vi'
  ) {
    return {
      data: await this.update(id, data),
      message: this.i18nService.translate(TranslationMessage.UPDATE_SUCCESS, lang)
    }
  }
  //#endregion

  //#region Used by other modules too (plain data, unchanged shapes)
  async findById(id: number): Promise<TranslationType> {
    const translation = await this.translationRepository.findById(id)
    if (!translation) {
      throw new TranslationNotFoundException()
    }
    return translation
  }

  async findByKeyAndLanguage(
    key: string,
    languageId: number
  ): Promise<TranslationType | null> {
    if (!key || key.trim() === '') {
      this.logger.warn(`Translation key is empty or undefined: ${key}`)
      return null
    }
    return this.translationRepository.findByKeyAndLanguage(key, languageId)
  }

  async findByKeyOrMeaningPrefix(
    key: string,
    languageId: number
  ): Promise<TranslationType[]> {
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

  async findByKey(params: GetTranslationsByKeyQueryType) {
    const translations = await this.translationRepository.findByKey(params.key)
    return { key: params.key, translations }
  }

  async create(data: CreateTranslationBodyType): Promise<TranslationType> {
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

  async createMany(data: CreateTranslationBodyType[]): Promise<{ count: number }> {
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

  async update(id: number, data: UpdateTranslationBodyType): Promise<TranslationType> {
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
    data: UpdateTranslationBodyType
  ): Promise<TranslationType> {
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

  async deleteByKey(key: string): Promise<{ count: number }> {
    try {
      return await this.translationRepository.deleteByKey(key)
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
}
