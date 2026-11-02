import { Injectable, Logger } from '@nestjs/common'
import {
  CreateGrammarUsageBodyType,
  UpdateGrammarUsageBodyType,
  GetGrammarUsageByIdParamsType,
  GetGrammarUsageListQueryType
} from './entities/grammar-usage.entities'
import {
  GrammarUsageNotFoundException,
  GrammarUsageAlreadyExistsException,
  InvalidGrammarUsageDataException,
  GrammarNotFoundException
} from './dto/grammar-usage.error'
import { GrammarUsageRepository } from './grammar-usage.repo'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'

@Injectable()
export class GrammarUsageService {
  private readonly logger = new Logger(GrammarUsageService.name)

  constructor(private readonly grammarUsageRepository: GrammarUsageRepository) {}

  async getGrammarUsageList(params: GetGrammarUsageListQueryType) {
    try {
      this.logger.log('Getting grammar usage list with params:', params)

      const result = await this.grammarUsageRepository.findMany(params)

      this.logger.log(`Found ${result.data.length} grammar usage entries`)
      return {
        ...result,
        message: 'Lấy danh sách cách sử dụng ngữ pháp thành công'
      }
    } catch (error) {
      this.logger.error('Error getting grammar usage list:', error)
      throw error
    }
  }

  async getGrammarUsageById(params: GetGrammarUsageByIdParamsType) {
    try {
      this.logger.log(`Getting grammar usage by id: ${params.id}`)

      const grammarUsage = await this.grammarUsageRepository.findById(params.id)

      if (!grammarUsage) {
        throw new GrammarUsageNotFoundException()
      }

      this.logger.log(`Found grammar usage: ${grammarUsage.id}`)
      return {
        data: grammarUsage,
        message: 'Lấy thông tin cách sử dụng ngữ pháp thành công'
      }
    } catch (error) {
      this.logger.error(`Error getting grammar usage by id ${params.id}:`, error)

      if (error instanceof GrammarUsageNotFoundException) {
        throw error
      }

      throw new InvalidGrammarUsageDataException(
        'Lỗi khi lấy thông tin cách sử dụng ngữ pháp'
      )
    }
  }

  async createGrammarUsage(data: CreateGrammarUsageBodyType) {
    try {
      this.logger.log('Creating grammar usage with data:', data)

      // Validate grammar exists
      const grammarExists = await this.grammarUsageRepository.checkGrammarExists(
        data.grammarId
      )
      if (!grammarExists) {
        throw new GrammarNotFoundException()
      }

      // Check if usage already exists for this grammar
      const usageExists = await this.grammarUsageRepository.checkUsageExistsInGrammar(
        data.grammarId,
        data.explanationKey
      )
      if (usageExists) {
        throw new GrammarUsageAlreadyExistsException()
      }

      const grammarUsage = await this.grammarUsageRepository.create(data)

      this.logger.log(`Created grammar usage: ${grammarUsage.id}`)
      return {
        data: grammarUsage,
        message: 'Tạo cách sử dụng ngữ pháp thành công'
      }
    } catch (error) {
      this.logger.error('Error creating grammar usage:', error)

      if (
        error instanceof GrammarNotFoundException ||
        error instanceof GrammarUsageAlreadyExistsException
      ) {
        throw error
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new GrammarUsageAlreadyExistsException()
      }

      throw new InvalidGrammarUsageDataException('Lỗi khi tạo cách sử dụng ngữ pháp')
    }
  }

  async updateGrammarUsage(id: number, data: UpdateGrammarUsageBodyType) {
    try {
      this.logger.log(`Updating grammar usage ${id} with data:`, data)

      // Check if grammar usage exists
      const grammarUsage = await this.grammarUsageRepository.findById(id)
      if (!grammarUsage) {
        throw new GrammarUsageNotFoundException()
      }

      // Check if new explanation key already exists for this grammar (if updating explanationKey)
      if (data.explanationKey && data.explanationKey !== grammarUsage.explanationKey) {
        const usageExists = await this.grammarUsageRepository.checkUsageExistsInGrammar(
          grammarUsage.grammarId,
          data.explanationKey,
          id
        )
        if (usageExists) {
          throw new GrammarUsageAlreadyExistsException()
        }
      }

      const updatedGrammarUsage = await this.grammarUsageRepository.update(id, data)

      this.logger.log(`Updated grammar usage: ${updatedGrammarUsage.id}`)
      return {
        data: updatedGrammarUsage,
        message: 'Cập nhật cách sử dụng ngữ pháp thành công'
      }
    } catch (error) {
      this.logger.error(`Error updating grammar usage ${id}:`, error)

      if (
        error instanceof GrammarUsageNotFoundException ||
        error instanceof GrammarUsageAlreadyExistsException
      ) {
        throw error
      }

      throw new InvalidGrammarUsageDataException('Lỗi khi cập nhật cách sử dụng ngữ pháp')
    }
  }

  async deleteGrammarUsage(id: number) {
    try {
      this.logger.log(`Deleting grammar usage ${id}`)

      // Check if grammar usage exists
      const grammarUsage = await this.grammarUsageRepository.findById(id)
      if (!grammarUsage) {
        throw new GrammarUsageNotFoundException()
      }

      await this.grammarUsageRepository.delete(id)

      this.logger.log(`Deleted grammar usage ${id}`)
      return {
        message: 'Xóa cách sử dụng ngữ pháp thành công'
      }
    } catch (error) {
      this.logger.error(`Error deleting grammar usage ${id}:`, error)

      if (error instanceof GrammarUsageNotFoundException) {
        throw error
      }

      if (isNotFoundPrismaError(error)) {
        throw new GrammarUsageNotFoundException()
      }

      throw new InvalidGrammarUsageDataException('Lỗi khi xóa cách sử dụng ngữ pháp')
    }
  }
}
