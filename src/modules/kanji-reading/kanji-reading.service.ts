import { I18nService } from '@/i18n/i18n.service'
import { KanjiReadingMessage } from '@/i18n/message-keys'
import { toPaginationMeta } from '@/shared/utils/pagination'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import {
  InvalidKanjiReadingDataException,
  KanjiReadingAlreadyExistsException,
  KanjiReadingKanjiNotFoundException,
  KanjiReadingNotFoundException
} from './dto/kanji-reading.error'
import {
  CreateKanjiReadingBodyType,
  GetKanjiReadingListQueryType,
  KanjiReading,
  UpdateKanjiReadingBodyType
} from './entities/kanji-reading.entity'
import { KanjiReadingRepo } from './kanji-reading.repo'

@Injectable()
export class KanjiReadingService {
  private readonly logger = new Logger(KanjiReadingService.name)

  constructor(
    private readonly kanjiReadingRepository: KanjiReadingRepo,
    private readonly i18nService: I18nService
  ) {}

  //#region HTTP routes (envelope + translated message)
  async findMany(params: GetKanjiReadingListQueryType, lang: string = 'vi') {
    const result = await this.kanjiReadingRepository.findMany(params)
    return {
      statusCode: 200,
      message: this.i18nService.translate(KanjiReadingMessage.GET_LIST_SUCCESS, lang),
      data: {
        results: result.data,
        pagination: toPaginationMeta(params.page, params.limit, result.total)
      }
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const reading = await this.kanjiReadingRepository.findById(id)
    if (!reading) {
      throw new KanjiReadingNotFoundException()
    }
    return {
      data: reading,
      message: this.i18nService.translate(KanjiReadingMessage.GET_SUCCESS, lang)
    }
  }

  async findByKanjiId(kanjiId: number, lang: string = 'vi') {
    return {
      data: await this.kanjiReadingRepository.findByKanjiId(kanjiId),
      message: this.i18nService.translate(KanjiReadingMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findByReadingType(readingType: string, lang: string = 'vi') {
    return {
      data: await this.kanjiReadingRepository.findByReadingType(readingType),
      message: this.i18nService.translate(KanjiReadingMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async createReading(data: CreateKanjiReadingBodyType, lang: string = 'vi') {
    return {
      data: await this.create(data),
      message: this.i18nService.translate(KanjiReadingMessage.CREATE_SUCCESS, lang)
    }
  }

  async updateReading(id: number, data: UpdateKanjiReadingBodyType, lang: string = 'vi') {
    return {
      data: await this.update(id, data),
      message: this.i18nService.translate(KanjiReadingMessage.UPDATE_SUCCESS, lang)
    }
  }

  async delete(id: number, lang: string = 'vi') {
    try {
      if (!(await this.kanjiReadingRepository.findById(id))) {
        throw new KanjiReadingNotFoundException()
      }
      await this.kanjiReadingRepository.delete(id)
      return {
        message: this.i18nService.translate(KanjiReadingMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toKanjiReadingError(error)
    }
  }

  async deleteByKanjiId(kanjiId: number, lang: string = 'vi') {
    await this.kanjiReadingRepository.deleteByKanjiId(kanjiId)
    return {
      message: this.i18nService.translate(KanjiReadingMessage.DELETE_SUCCESS, lang)
    }
  }

  async getStats(lang: string = 'vi') {
    return {
      data: await this.kanjiReadingRepository.getStats(),
      message: this.i18nService.translate(KanjiReadingMessage.GET_STATS_SUCCESS, lang)
    }
  }

  async getReadingTypeStats(lang: string = 'vi') {
    const stats = await this.kanjiReadingRepository.getStats()
    return {
      data: stats.byReadingType,
      message: this.i18nService.translate(KanjiReadingMessage.GET_STATS_SUCCESS, lang)
    }
  }
  //#endregion

  //#region Used by kanji too (plain data, unchanged shapes)
  async create(data: CreateKanjiReadingBodyType): Promise<KanjiReading> {
    try {
      if (
        await this.kanjiReadingRepository.existsByKanjiTypeAndReading(
          data.kanjiId,
          data.readingType,
          data.reading
        )
      ) {
        throw new KanjiReadingAlreadyExistsException()
      }
      return await this.kanjiReadingRepository.create(data)
    } catch (error) {
      throw this.toKanjiReadingError(error)
    }
  }

  async update(id: number, data: UpdateKanjiReadingBodyType): Promise<KanjiReading> {
    try {
      const existing = await this.kanjiReadingRepository.findById(id)
      if (!existing) {
        throw new KanjiReadingNotFoundException()
      }

      // A changed reading must not repeat another reading of the same kanji
      if (
        (data.readingType || data.reading) &&
        (data.readingType !== existing.readingType ||
          data.reading !== existing.reading) &&
        (await this.kanjiReadingRepository.existsByKanjiTypeAndReading(
          existing.kanjiId,
          data.readingType || existing.readingType,
          data.reading || existing.reading
        ))
      ) {
        throw new KanjiReadingAlreadyExistsException()
      }

      return await this.kanjiReadingRepository.update(id, data)
    } catch (error) {
      throw this.toKanjiReadingError(error)
    }
  }
  //#endregion

  /**
   * Error to answer, decided by type (was by message text): our HTTP errors
   * pass through, a missing kanji (foreign key) is 404, unique 409, a missing
   * reading 404, anything else the generic "invalid data" 400 as before.
   */
  private toKanjiReadingError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'Kanji reading request failed',
      error instanceof Error ? error.stack : error
    )
    if (isForeignKeyConstraintPrismaError(error)) {
      return new KanjiReadingKanjiNotFoundException()
    }
    if (isUniqueConstraintPrismaError(error))
      return new KanjiReadingAlreadyExistsException()
    if (isNotFoundPrismaError(error)) return new KanjiReadingNotFoundException()
    return new InvalidKanjiReadingDataException()
  }
}
