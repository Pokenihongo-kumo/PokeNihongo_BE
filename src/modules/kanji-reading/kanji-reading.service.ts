import {
  CreateKanjiReadingBodyType,
  UpdateKanjiReadingBodyType,
  GetKanjiReadingListQueryType,
  KanjiReading
} from './entities/kanji-reading.entities'

import {
  KanjiReadingNotFoundException,
  KanjiReadingAlreadyExistsException,
  InvalidKanjiReadingDataException
} from './dto/kanji-reading.error'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { Injectable, Logger } from '@nestjs/common'
import { KanjiReadingRepository } from './kanji-reading.repo'

@Injectable()
export class KanjiReadingService {
  private readonly logger = new Logger(KanjiReadingService.name)

  constructor(private readonly kanjiReadingRepository: KanjiReadingRepository) {}

  async findMany(params: GetKanjiReadingListQueryType) {
    try {
      this.logger.log(`Finding kanji readings with params: ${JSON.stringify(params)}`)

      // Set default values
      const queryParams = {
        page: params.page || 1,
        limit: params.limit || 10,
        search: params.search,
        kanjiId: params.kanjiId,
        readingType: params.readingType,
        sortBy: params.sortBy,
        sort: params.sort
      }

      const result = await this.kanjiReadingRepository.findMany(queryParams)

      return {
        statusCode: 200,
        message: 'Lấy danh sách cách đọc kanji thành công',
        data: {
          results: result.data,
          pagination: {
            current: result.page,
            pageSize: result.limit,
            totalPage: result.totalPages,
            totalItem: result.total
          }
        }
      }
    } catch (error) {
      this.logger.error('Error finding kanji readings:', error)
      throw error
    }
  }

  async findById(id: number) {
    try {
      this.logger.log(`Finding kanji reading by id: ${id}`)
      const reading = await this.kanjiReadingRepository.findById(id)

      if (!reading) {
        throw KanjiReadingNotFoundException
      }

      return reading
    } catch (error) {
      this.logger.error('Error finding kanji reading by id:', error)
      throw error
    }
  }

  async findByKanjiId(kanjiId: number): Promise<KanjiReading[]> {
    try {
      this.logger.log(`Finding kanji readings by kanji id: ${kanjiId}`)
      return await this.kanjiReadingRepository.findByKanjiId(kanjiId)
    } catch (error) {
      this.logger.error('Error finding kanji readings by kanji id:', error)
      throw error
    }
  }

  async findByReadingType(readingType: string): Promise<KanjiReading[]> {
    try {
      this.logger.log(`Finding kanji readings by type: ${readingType}`)
      return await this.kanjiReadingRepository.findByReadingType(readingType)
    } catch (error) {
      this.logger.error('Error finding kanji readings by type:', error)
      throw error
    }
  }

  async create(data: CreateKanjiReadingBodyType): Promise<KanjiReading> {
    try {
      this.logger.log(`Creating kanji reading for kanji: ${data.kanjiId}`)

      // Kiểm tra cách đọc đã tồn tại chưa (kiểm tra cả reading cụ thể)
      const readingExists = await this.kanjiReadingRepository.existsByKanjiTypeAndReading(
        data.kanjiId,
        data.readingType,
        data.reading
      )
      if (readingExists) {
        throw KanjiReadingAlreadyExistsException
      }

      const reading = await this.kanjiReadingRepository.create(data)
      this.logger.log(`Kanji reading created successfully: ${reading.id}`)
      return reading
    } catch (error) {
      this.logger.error('Error creating kanji reading:', error)
      if (error.message.includes('đã tồn tại')) {
        throw error
      }
      throw InvalidKanjiReadingDataException
    }
  }

  async update(id: number, data: UpdateKanjiReadingBodyType): Promise<KanjiReading> {
    try {
      this.logger.log(`Updating kanji reading: ${id}`)

      // Kiểm tra cách đọc có tồn tại không
      const existingReading = await this.kanjiReadingRepository.findById(id)
      if (!existingReading) {
        throw KanjiReadingNotFoundException
      }

      // Kiểm tra cách đọc mới đã tồn tại chưa (nếu có thay đổi)
      if (
        (data.readingType || data.reading) &&
        (data.readingType !== existingReading.readingType ||
          data.reading !== existingReading.reading)
      ) {
        const readingExists =
          await this.kanjiReadingRepository.existsByKanjiTypeAndReading(
            existingReading.kanjiId,
            data.readingType || existingReading.readingType,
            data.reading || existingReading.reading
          )
        if (readingExists) {
          throw KanjiReadingAlreadyExistsException
        }
      }

      const reading = await this.kanjiReadingRepository.update(id, data)
      this.logger.log(`Kanji reading updated successfully: ${reading.id}`)
      return reading
    } catch (error) {
      this.logger.error('Error updating kanji reading:', error)
      if (
        error.message.includes('không tồn tại') ||
        error.message.includes('đã tồn tại')
      ) {
        throw error
      }
      throw InvalidKanjiReadingDataException
    }
  }

  async delete(id: number): Promise<void> {
    try {
      this.logger.log(`Deleting kanji reading: ${id}`)

      // Kiểm tra cách đọc có tồn tại không
      const existingReading = await this.kanjiReadingRepository.findById(id)
      if (!existingReading) {
        throw KanjiReadingNotFoundException
      }

      await this.kanjiReadingRepository.delete(id)
      this.logger.log(`Kanji reading deleted successfully: ${id}`)
    } catch (error) {
      this.logger.error('Error deleting kanji reading:', error)
      if (error.message.includes('không tồn tại')) {
        throw error
      }
      throw InvalidKanjiReadingDataException
    }
  }

  async deleteByKanjiId(kanjiId: number): Promise<void> {
    try {
      this.logger.log(`Deleting kanji readings by kanji id: ${kanjiId}`)
      await this.kanjiReadingRepository.deleteByKanjiId(kanjiId)
      this.logger.log(`Kanji readings deleted successfully for kanji: ${kanjiId}`)
    } catch (error) {
      this.logger.error('Error deleting kanji readings by kanji id:', error)
      throw error
    }
  }

  async getStats() {
    try {
      this.logger.log('Getting kanji reading statistics')
      return await this.kanjiReadingRepository.getStats()
    } catch (error) {
      this.logger.error('Error getting kanji reading statistics:', error)
      throw error
    }
  }

  async getReadingsByKanjiIds(kanjiIds: number[]): Promise<KanjiReading[]> {
    try {
      this.logger.log(`Getting readings for kanji ids: ${kanjiIds.join(', ')}`)
      return await this.kanjiReadingRepository.getReadingsByKanjiIds(kanjiIds)
    } catch (error) {
      this.logger.error('Error getting readings by kanji ids:', error)
      throw error
    }
  }

  async existsByKanjiId(kanjiId: number): Promise<boolean> {
    try {
      this.logger.log(`Checking if readings exist for kanji: ${kanjiId}`)
      return await this.kanjiReadingRepository.existsByKanjiId(kanjiId)
    } catch (error) {
      this.logger.error('Error checking readings existence by kanji id:', error)
      throw error
    }
  }

  // Utility methods
  async getReadingsByType(readingType: string): Promise<KanjiReading[]> {
    try {
      this.logger.log(`Getting readings by type: ${readingType}`)
      return await this.kanjiReadingRepository.findByReadingType(readingType)
    } catch (error) {
      this.logger.error('Error getting readings by type:', error)
      throw error
    }
  }

  async getReadingsByKanji(kanjiId: number): Promise<KanjiReading[]> {
    try {
      this.logger.log(`Getting readings for kanji: ${kanjiId}`)
      return await this.kanjiReadingRepository.findByKanjiId(kanjiId)
    } catch (error) {
      this.logger.error('Error getting readings by kanji:', error)
      throw error
    }
  }

  async validateReadingType(readingType: string): Promise<boolean> {
    const validTypes = ['onyomi', 'kunyomi', 'nanori', 'irregular']
    return validTypes.includes(readingType.toLowerCase())
  }

  async getReadingTypeStats(): Promise<{ readingType: string; count: number }[]> {
    try {
      this.logger.log('Getting reading type statistics')
      const stats = await this.kanjiReadingRepository.getStats()
      return stats.byReadingType
    } catch (error) {
      this.logger.error('Error getting reading type statistics:', error)
      throw error
    }
  }
}
