import {
  CreateLanguagesBodyType,
  UpdateLanguagesBodyType,
  GetLanguagesListQueryType,
  GetLanguagesByCodeParamsType,
  LanguagesType
} from './entities/languages.entities'
import { LanguagesRepository } from './languages.repo'
import {
  LanguagesNotFoundException,
  LanguagesAlreadyExistsException,
  InvalidLanguagesDataException,
  LanguageCodeAlreadyExistsException
} from './dto/languages.error'
import { LANGUAGES_MESSAGE } from '@/common/constants/message'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { Injectable, Logger, HttpException } from '@nestjs/common'

@Injectable()
export class LanguagesService {
  private readonly logger = new Logger(LanguagesService.name)

  constructor(private readonly languagesRepository: LanguagesRepository) {}

  async findMany(params: GetLanguagesListQueryType) {
    try {
      this.logger.log(`Finding languages with params: ${JSON.stringify(params)}`)
      const result = await this.languagesRepository.findMany(params)

      return {
        statusCode: 200,
        message: LANGUAGES_MESSAGE.GET_LIST_SUCCESS,
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
      this.logger.error('Error finding languages:', error)
      throw error
    }
  }

  async findById(id: number) {
    try {
      this.logger.log(`Finding language by id: ${id}`)
      const language = await this.languagesRepository.findById(id)

      if (!language) {
        throw LanguagesNotFoundException
      }

      return {
        data: language,
        message: LANGUAGES_MESSAGE.GET_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding language by id:', error)
      throw error
    }
  }

  async findByCode(params: GetLanguagesByCodeParamsType) {
    try {
      this.logger.log(`Finding language by code: ${params.code}`)
      const language = await this.languagesRepository.findByCode(params.code)

      if (!language) {
        throw LanguagesNotFoundException
      }

      return {
        data: language,
        message: LANGUAGES_MESSAGE.GET_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error finding language by code:', error)
      throw error
    }
  }

  async create(data: CreateLanguagesBodyType) {
    try {
      this.logger.log(`Creating language: ${data.code} - ${data.name}`)

      // Kiểm tra ngôn ngữ đã tồn tại chưa
      const existingLanguage = await this.languagesRepository.findByCode(data.code)
      if (existingLanguage) {
        this.logger.error('Language already exists:', data.code)
        throw LanguagesAlreadyExistsException
      }

      const language = await this.languagesRepository.create(data)
      this.logger.log(`Language created successfully: ${language.id}`)

      return {
        data: language,
        message: LANGUAGES_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error creating language:', error)
      if (error instanceof HttpException) {
        throw error
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw LanguagesAlreadyExistsException
      }
      throw error
    }
  }

  async update(id: number, data: UpdateLanguagesBodyType) {
    try {
      this.logger.log(`Updating language: ${id}`)

      // Kiểm tra ngôn ngữ có tồn tại không
      const existingLanguage = await this.languagesRepository.findById(id)
      if (!existingLanguage) {
        throw LanguagesNotFoundException
      }

      // Nếu thay đổi code, kiểm tra code mới có trùng không
      if (data.code && data.code !== existingLanguage.code) {
        const duplicateLanguage = await this.languagesRepository.findByCode(data.code)
        if (duplicateLanguage) {
          throw LanguagesAlreadyExistsException
        }
      }

      const language = await this.languagesRepository.update(id, data)
      this.logger.log(`Language updated successfully: ${language.id}`)

      return {
        data: language,
        message: LANGUAGES_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error updating language:', error)
      if (error instanceof HttpException) {
        throw error
      }
      throw error
    }
  }

  async updateByCode(code: string, data: UpdateLanguagesBodyType) {
    try {
      this.logger.log(`Updating language by code: ${code}`)

      // Kiểm tra ngôn ngữ có tồn tại không
      const existingLanguage = await this.languagesRepository.findByCode(code)
      if (!existingLanguage) {
        throw LanguagesNotFoundException
      }

      // Nếu thay đổi code, kiểm tra code mới có trùng không
      if (data.code && data.code !== code) {
        const duplicateLanguage = await this.languagesRepository.findByCode(data.code)
        if (duplicateLanguage) {
          throw LanguagesAlreadyExistsException
        }
      }

      const language = await this.languagesRepository.updateByCode(code, data)
      this.logger.log(`Language updated successfully: ${language.id}`)

      return {
        data: language,
        message: LANGUAGES_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error updating language by code:', error)
      throw InvalidLanguagesDataException
    }
  }

  async delete(id: number) {
    try {
      this.logger.log(`Deleting language: ${id}`)

      // Kiểm tra ngôn ngữ có tồn tại không
      const existingLanguage = await this.languagesRepository.findById(id)
      if (!existingLanguage) {
        throw LanguagesNotFoundException
      }

      await this.languagesRepository.delete(id)
      this.logger.log(`Language deleted successfully: ${id}`)

      return {
        message: LANGUAGES_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error deleting language:', error)
      throw InvalidLanguagesDataException
    }
  }

  async deleteByCode(code: string) {
    try {
      this.logger.log(`Deleting language by code: ${code}`)

      // Kiểm tra ngôn ngữ có tồn tại không
      const existingLanguage = await this.languagesRepository.findByCode(code)
      if (!existingLanguage) {
        throw LanguagesNotFoundException
      }

      await this.languagesRepository.deleteByCode(code)
      this.logger.log(`Language deleted successfully: ${code}`)

      return {
        message: LANGUAGES_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      this.logger.error('Error deleting language by code:', error)
      throw InvalidLanguagesDataException
    }
  }

  /**
   * Kiểm tra ngôn ngữ có được hỗ trợ không
   */
  async isLanguageSupported(code: string): Promise<boolean> {
    try {
      const language = await this.languagesRepository.findByCode(code)
      return !!language
    } catch (error) {
      this.logger.error(`Error checking if language ${code} is supported:`, error)
      return false
    }
  }

  /**
   * Tạo các ngôn ngữ mặc định nếu chưa có
   */
  async createDefaultLanguages(): Promise<void> {
    try {
      this.logger.log('Creating default languages')

      const defaultLanguages = [
        { id: 1, name: 'Tiếng Việt', code: 'vi', flag: '🇻🇳' },
        { id: 2, name: 'English', code: 'en', flag: '🇺🇸' },
        { id: 3, name: '日本語', code: 'ja', flag: '🇯🇵' }
      ]

      for (const language of defaultLanguages) {
        const existing = await this.languagesRepository.findByCode(language.code)

        if (!existing) {
          // Tạo language với ID cụ thể
          await this.languagesRepository.create({
            id: language.id,
            name: language.name,
            code: language.code,
            flag: language.flag
          })
          this.logger.log(
            `Created default language with ID ${language.id}: ${language.name} (${language.code})`
          )
        } else {
          this.logger.log(`Language ${language.code} already exists`)
        }
      }

      this.logger.log('Default languages creation completed')
    } catch (error) {
      this.logger.error('Error creating default languages:', error)
      throw error
    }
  }
}
