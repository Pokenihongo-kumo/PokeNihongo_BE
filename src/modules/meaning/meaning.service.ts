import { I18nService } from '@/i18n/i18n.service'
import { MeaningMessage } from '@/i18n/message-keys'
import { TranslationHelperService } from '@/modules/translation/translation.helper.service'
import { toPaginationMeta } from '@/shared/utils/pagination'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import {
  InvalidMeaningDataException,
  MeaningNotFoundException,
  MeaningVocabularyNotFoundException,
  MeaningWordTypeNotFoundException
} from './dto/meaning.error'
import {
  CreateMeaningBodyType,
  GetMeaningListQueryType,
  MeaningType,
  MeaningWithTranslationsType,
  UpdateMeaningBodyType
} from './entities/meaning.entity'
import { MeaningRepo } from './meaning.repo'

type TranslationItem = { language_code: string; value: string }

@Injectable()
export class MeaningService {
  private readonly logger = new Logger(MeaningService.name)

  constructor(
    private readonly meaningRepository: MeaningRepo,
    private readonly translationHelper: TranslationHelperService,
    private readonly i18nService: I18nService
  ) {}

  //#region HTTP routes (envelope + translated message)
  async findMany(params: GetMeaningListQueryType, lang: string = 'vi') {
    const result = await this.meaningRepository.findMany(params)
    return {
      statusCode: 200,
      message: this.i18nService.translate(MeaningMessage.GET_LIST_SUCCESS, lang),
      data: {
        results: result.data,
        pagination: toPaginationMeta(params.page, params.limit, result.total)
      }
    }
  }

  async getByVocabularyId(vocabularyId: number, lang: string = 'vi') {
    return {
      data: await this.findByVocabularyId(vocabularyId),
      message: this.i18nService.translate(MeaningMessage.GET_SUCCESS, lang)
    }
  }

  async createMeaning(data: CreateMeaningBodyType, lang: string = 'vi') {
    return {
      data: await this.create(data),
      message: this.i18nService.translate(MeaningMessage.CREATE_SUCCESS, lang)
    }
  }

  async update(id: number, data: UpdateMeaningBodyType, lang: string = 'vi') {
    try {
      if (!(await this.meaningRepository.findById(id))) {
        throw new MeaningNotFoundException()
      }
      return {
        data: await this.meaningRepository.update(id, data),
        message: this.i18nService.translate(MeaningMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toMeaningError(error)
    }
  }

  async delete(id: number): Promise<void> {
    try {
      if (!(await this.meaningRepository.findById(id))) {
        throw new MeaningNotFoundException()
      }
      await this.meaningRepository.delete(id)
    } catch (error) {
      throw this.toMeaningError(error)
    }
  }

  deleteByVocabularyId(vocabularyId: number): Promise<{ count: number }> {
    return this.meaningRepository.deleteByVocabularyId(vocabularyId)
  }
  //#endregion

  //#region Used by vocabulary and lesson-content (plain data, unchanged shape)
  async findByVocabularyId(vocabularyId: number): Promise<MeaningWithTranslationsType[]> {
    const meanings = await this.meaningRepository.findByVocabularyId(vocabularyId)
    return Promise.all(
      meanings.map(async (meaning) => ({
        ...meaning,
        meaningTranslations: await this.translationsOf(meaning.meaningKey),
        exampleTranslations: await this.translationsOf(meaning.exampleSentenceKey)
      }))
    )
  }

  // Keys are generated from the vocabulary id
  async create(data: CreateMeaningBodyType): Promise<MeaningType> {
    try {
      return await this.meaningRepository.create({
        ...data,
        meaningKey: `meaning.${data.vocabularyId}.definition`,
        exampleSentenceKey: `meaning.${data.vocabularyId}.example`,
        explanationKey: `meaning.${data.vocabularyId}.explanation`
      })
    } catch (error) {
      throw this.toMeaningError(error)
    }
  }
  //#endregion

  // A failed lookup leaves the list empty, as before
  private async translationsOf(key?: string | null): Promise<TranslationItem[]> {
    if (!key) return []
    try {
      const byCode = await this.translationHelper.getTranslationsByKey(key)
      return Object.entries(byCode).map(([language_code, value]) => ({
        language_code,
        value
      }))
    } catch (error) {
      this.logger.warn(`Failed to get translations for ${key}`, error)
      return []
    }
  }

  /**
   * Error to answer, decided by type (not message text): our HTTP errors pass
   * through, a missing vocabulary/word type (foreign key) is 404, a missing
   * meaning 404, anything else the generic "invalid data" 400 as before.
   */
  private toMeaningError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'Meaning request failed',
      error instanceof Error ? error.stack : error
    )
    if (isForeignKeyConstraintPrismaError(error)) {
      return String(error.meta?.field_name ?? '').includes('wordTypeId')
        ? new MeaningWordTypeNotFoundException()
        : new MeaningVocabularyNotFoundException()
    }
    if (isNotFoundPrismaError(error)) return new MeaningNotFoundException()
    return new InvalidMeaningDataException()
  }
}
