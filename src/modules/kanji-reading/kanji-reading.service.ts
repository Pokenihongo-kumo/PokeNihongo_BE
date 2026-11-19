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
  CreateKanjiReadingBody,
  GetKanjiReadingListQuery,
  UpdateKanjiReadingBody
} from './dto/kanji-reading.zod-dto'
import { KanjiReading } from './entities/kanji-reading.entity'
import { KanjiReadingRepo } from './kanji-reading.repo'

@Injectable()
export class KanjiReadingService {
  private readonly logger = new Logger(KanjiReadingService.name)

  constructor(private readonly kanjiReadingRepository: KanjiReadingRepo) {}

  //#region HTTP routes (envelope + translated message)
  async findMany(params: GetKanjiReadingListQuery) {
    const result = await this.kanjiReadingRepository.findMany(params)
    return {
      results: result.data,
      pagination: toPaginationMeta(params.page, params.limit, result.total)
    }
  }

  async findById(id: number) {
    const reading = await this.kanjiReadingRepository.findById(id)
    if (!reading) {
      throw new KanjiReadingNotFoundException()
    }
    return reading
  }

  async findByKanjiId(kanjiId: number) {
    return await this.kanjiReadingRepository.findByKanjiId(kanjiId)
  }

  async findByReadingType(readingType: string) {
    return await this.kanjiReadingRepository.findByReadingType(readingType)
  }

  async createReading(data: CreateKanjiReadingBody) {
    return await this.create(data)
  }

  async updateReading(id: number, data: UpdateKanjiReadingBody) {
    return await this.update(id, data)
  }

  async delete(id: number) {
    try {
      if (!(await this.kanjiReadingRepository.findById(id))) {
        throw new KanjiReadingNotFoundException()
      }
      await this.kanjiReadingRepository.delete(id)
      return
    } catch (error) {
      throw this.toKanjiReadingError(error)
    }
  }

  async deleteByKanjiId(kanjiId: number) {
    await this.kanjiReadingRepository.deleteByKanjiId(kanjiId)
    return
  }

  async getStats() {
    return await this.kanjiReadingRepository.getStats()
  }

  async getReadingTypeStats() {
    const stats = await this.kanjiReadingRepository.getStats()
    return stats.byReadingType
  }
  //#endregion

  //#region Used by kanji too (plain data, unchanged shapes)
  async create(data: CreateKanjiReadingBody): Promise<KanjiReading> {
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

  async update(id: number, data: UpdateKanjiReadingBody): Promise<KanjiReading> {
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
