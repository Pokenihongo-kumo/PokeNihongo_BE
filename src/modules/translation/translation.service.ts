import {
  CreateTranslationBodyType,
  UpdateTranslationBodyType,
  GetTranslationListQueryType,
  GetTranslationsByKeyQueryType,
  GetTranslationsByLanguageQueryType,
  TranslationType
} from './entities/translation.entity'
import { TranslationRepo } from './translation.repo'
import { Injectable, Logger } from '@nestjs/common'
import {
  TranslationNotFoundException,
  TranslationAlreadyExistsException,
  InvalidTranslationDataException
} from './dto/translation.error'

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name)

  constructor(private readonly translationRepository: TranslationRepo) {}

  async findMany(params: GetTranslationListQueryType) {
    try {
      this.logger.log(`Finding translations with params: ${JSON.stringify(params)}`)
      const result = await this.translationRepository.findMany(params)

      return {
        statusCode: 200,
        message: 'Lấy danh sách bản dịch thành công',
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
      this.logger.error('Error finding translations:', error)
      throw error
    }
  }

  async findById(id: number): Promise<TranslationType> {
    try {
      this.logger.log(`Finding translation by id: ${id}`)
      const translation = await this.translationRepository.findById(id)

      if (!translation) {
        throw TranslationNotFoundException
      }

      return translation
    } catch (error) {
      this.logger.error('Error finding translation by id:', error)
      throw error
    }
  }

  async findByKeyAndLanguage(
    key: string,
    languageId: number
  ): Promise<TranslationType | null> {
    try {
      // Kiểm tra key có tồn tại không
      if (!key || key.trim() === '') {
        this.logger.warn(`Translation key is empty or undefined: ${key}`)
        return null
      }

      this.logger.log(`Finding translation by key: ${key} and languageId: ${languageId}`)
      return await this.translationRepository.findByKeyAndLanguage(key, languageId)
    } catch (error) {
      this.logger.error('Error finding translation by key and language:', error)
      throw error
    }
  }

  async findByKeyOrMeaningPrefix(key: string, languageId: number) {
    try {
      if (!key || key.trim() === '') {
        this.logger.warn(`Translation key is empty or undefined: ${key}`)
        return []
      }
      this.logger.log(
        `Finding translations by key or meaning prefix: ${key}, languageId: ${languageId}`
      )
      return await this.translationRepository.findByKeyOrMeaningPrefix(key, languageId)
    } catch (error) {
      this.logger.error('Error finding translation by key or meaning prefix:', error)
      throw error
    }
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
    try {
      this.logger.log(`Finding translations by key: ${params.key}`)
      const translations = await this.translationRepository.findByKey(params.key)

      return {
        key: params.key,
        translations
      }
    } catch (error) {
      this.logger.error('Error finding translations by key:', error)
      throw error
    }
  }

  async findByLanguage(params: GetTranslationsByLanguageQueryType) {
    try {
      this.logger.log(`Finding translations by languageId: ${params.languageId}`)
      return await this.translationRepository.findByLanguage(params.languageId, {
        page: params.page,
        limit: params.limit
      })
    } catch (error) {
      this.logger.error('Error finding translations by language:', error)
      throw error
    }
  }

  async create(data: CreateTranslationBodyType): Promise<TranslationType> {
    try {
      this.logger.log(
        `Creating translation: ${data.key} - languageId: ${data.languageId}`
      )

      // Kiểm tra bản dịch đã tồn tại chưa
      const existingTranslation = await this.translationRepository.findByKeyAndLanguage(
        data.key,
        data.languageId
      )
      if (existingTranslation) {
        throw TranslationAlreadyExistsException
      }

      const translation = await this.translationRepository.create(data)
      this.logger.log(`Translation created successfully: ${translation.id}`)
      return translation
    } catch (error) {
      this.logger.error('Error creating translation:', error)
      throw InvalidTranslationDataException
    }
  }

  async createMany(data: CreateTranslationBodyType[]): Promise<{ count: number }> {
    try {
      this.logger.log(`Creating ${data.length} translations`)

      // Kiểm tra từng bản dịch có trùng không
      for (const item of data) {
        const existingTranslation = await this.translationRepository.findByKeyAndLanguage(
          item.key,
          item.languageId
        )
        if (existingTranslation) {
          throw TranslationAlreadyExistsException
        }
      }

      const result = await this.translationRepository.createMany(data)
      this.logger.log(`${result.count} translations created successfully`)
      return result
    } catch (error) {
      this.logger.error('Error creating multiple translations:', error)
      throw InvalidTranslationDataException
    }
  }

  async update(id: number, data: UpdateTranslationBodyType): Promise<TranslationType> {
    try {
      this.logger.log(`Updating translation: ${id}`)

      // Kiểm tra bản dịch có tồn tại không
      const existingTranslation = await this.translationRepository.findById(id)
      if (!existingTranslation) {
        throw TranslationNotFoundException
      }

      // Nếu thay đổi key hoặc languageId, kiểm tra trùng lặp
      if (
        (data.key && data.key !== existingTranslation.key) ||
        (data.languageId && data.languageId !== existingTranslation.languageId)
      ) {
        const duplicateTranslation =
          await this.translationRepository.findByKeyAndLanguage(
            data.key || existingTranslation.key,
            data.languageId || existingTranslation.languageId
          )
        if (duplicateTranslation && duplicateTranslation.id !== id) {
          throw TranslationAlreadyExistsException
        }
      }

      const translation = await this.translationRepository.update(id, data)
      this.logger.log(`Translation updated successfully: ${translation.id}`)
      return translation
    } catch (error) {
      this.logger.error('Error updating translation:', error)
      throw InvalidTranslationDataException
    }
  }

  async updateByKeyAndLanguage(
    key: string,
    languageId: number,
    data: UpdateTranslationBodyType
  ): Promise<TranslationType> {
    try {
      this.logger.log(`Updating translation by key: ${key} and languageId: ${languageId}`)

      // Kiểm tra bản dịch có tồn tại không
      const existingTranslation = await this.translationRepository.findByKeyAndLanguage(
        key,
        languageId
      )
      if (!existingTranslation) {
        throw TranslationNotFoundException
      }

      const translation = await this.translationRepository.updateByKeyAndLanguage(
        key,
        languageId,
        data
      )
      this.logger.log(`Translation updated successfully: ${translation.id}`)
      return translation
    } catch (error) {
      this.logger.error('Error updating translation by key and language:', error)
      throw InvalidTranslationDataException
    }
  }

  async delete(id: number): Promise<void> {
    try {
      this.logger.log(`Deleting translation: ${id}`)

      // Kiểm tra bản dịch có tồn tại không
      const existingTranslation = await this.translationRepository.findById(id)
      if (!existingTranslation) {
        throw TranslationNotFoundException
      }

      await this.translationRepository.delete(id)
      this.logger.log(`Translation deleted successfully: ${id}`)
    } catch (error) {
      this.logger.error('Error deleting translation:', error)
      throw InvalidTranslationDataException
    }
  }

  async deleteByKeyAndLanguage(key: string, languageId: number): Promise<void> {
    try {
      this.logger.log(`Deleting translation by key: ${key} and languageId: ${languageId}`)

      // Kiểm tra bản dịch có tồn tại không
      const existingTranslation = await this.translationRepository.findByKeyAndLanguage(
        key,
        languageId
      )
      if (!existingTranslation) {
        throw TranslationNotFoundException
      }

      await this.translationRepository.deleteByKeyAndLanguage(key, languageId)
      this.logger.log(
        `Translation deleted successfully: ${key} - languageId: ${languageId}`
      )
    } catch (error) {
      this.logger.error('Error deleting translation by key and language:', error)
      throw InvalidTranslationDataException
    }
  }

  async deleteByKey(key: string): Promise<{ count: number }> {
    try {
      this.logger.log(`Deleting all translations by key: ${key}`)
      const result = await this.translationRepository.deleteByKey(key)
      this.logger.log(`${result.count} translations deleted successfully for key: ${key}`)
      return result
    } catch (error) {
      this.logger.error('Error deleting translations by key:', error)
      throw InvalidTranslationDataException
    }
  }
}
