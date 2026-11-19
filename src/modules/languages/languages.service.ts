import { toPaginationMeta } from '@/shared/utils/pagination'
import {
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import {
  InvalidLanguagesDataException,
  LanguagesAlreadyExistsException,
  LanguagesNotFoundException
} from './dto/languages.error'
import {
  CreateLanguagesBody,
  GetLanguagesByCodeParams,
  GetLanguagesListQuery,
  UpdateLanguagesBody
} from './dto/languages.zod-dto'
import { LanguagesRepo } from './languages.repo'

// Other modules call findMany/findById/findByCode without a language; `lang`
// only picks the message, so it defaults to vi like before.
@Injectable()
export class LanguagesService {
  private readonly logger = new Logger(LanguagesService.name)

  constructor(private readonly languagesRepository: LanguagesRepo) {}

  async findMany(params: GetLanguagesListQuery) {
    const result = await this.languagesRepository.findMany(params)

    return {
      results: result.data,
      pagination: toPaginationMeta(params.currentPage, params.pageSize, result.total)
    }
  }

  async findById(id: number) {
    const language = await this.languagesRepository.findById(id)
    if (!language) {
      throw new LanguagesNotFoundException()
    }

    return language
  }

  async findByCode(params: GetLanguagesByCodeParams) {
    const language = await this.languagesRepository.findByCode(params.code)
    if (!language) {
      throw new LanguagesNotFoundException()
    }

    return language
  }

  async create(data: CreateLanguagesBody) {
    try {
      const existingLanguage = await this.languagesRepository.findByCode(data.code)
      if (existingLanguage) {
        throw new LanguagesAlreadyExistsException()
      }

      const language = await this.languagesRepository.create(data)
      this.logger.log(`Language created: ${language.id} (${language.code})`)

      return language
    } catch (error) {
      throw this.toLanguagesError(error, 'rethrow')
    }
  }

  async update(id: number, data: UpdateLanguagesBody) {
    try {
      const existingLanguage = await this.languagesRepository.findById(id)
      if (!existingLanguage) {
        throw new LanguagesNotFoundException()
      }

      if (data.code && data.code !== existingLanguage.code) {
        const duplicateLanguage = await this.languagesRepository.findByCode(data.code)
        if (duplicateLanguage) {
          throw new LanguagesAlreadyExistsException()
        }
      }

      const language = await this.languagesRepository.update(id, data)
      return language
    } catch (error) {
      throw this.toLanguagesError(error, 'rethrow')
    }
  }

  async updateByCode(code: string, data: UpdateLanguagesBody) {
    try {
      const existingLanguage = await this.languagesRepository.findByCode(code)
      if (!existingLanguage) {
        throw new LanguagesNotFoundException()
      }

      if (data.code && data.code !== code) {
        const duplicateLanguage = await this.languagesRepository.findByCode(data.code)
        if (duplicateLanguage) {
          throw new LanguagesAlreadyExistsException()
        }
      }

      const language = await this.languagesRepository.updateByCode(code, data)
      return language
    } catch (error) {
      throw this.toLanguagesError(error, 'invalid-data')
    }
  }

  async delete(id: number) {
    try {
      const existingLanguage = await this.languagesRepository.findById(id)
      if (!existingLanguage) {
        throw new LanguagesNotFoundException()
      }

      await this.languagesRepository.delete(id)
      // data: null keeps this an envelope for TransformInterceptor (without it
      // the message ended up nested under data)
      return
    } catch (error) {
      throw this.toLanguagesError(error, 'invalid-data')
    }
  }

  async deleteByCode(code: string) {
    try {
      const existingLanguage = await this.languagesRepository.findByCode(code)
      if (!existingLanguage) {
        throw new LanguagesNotFoundException()
      }

      await this.languagesRepository.deleteByCode(code)
      return
    } catch (error) {
      throw this.toLanguagesError(error, 'invalid-data')
    }
  }

  /**
   * Error to answer for a failed write, decided by type (not message text):
   * our HTTP errors pass through, Prisma unique/not-found become 409/404.
   * Anything else keeps its old answer: create/update let it through (500),
   * updateByCode/delete/deleteByCode answer the generic "invalid data" 400.
   * Before, those three also turned "not found" into that 400.
   */
  private toLanguagesError(
    error: unknown,
    otherwise: 'rethrow' | 'invalid-data'
  ): unknown {
    if (error instanceof HttpException) return error
    this.logger.error(
      'Language write failed',
      error instanceof Error ? error.stack : error
    )
    if (isUniqueConstraintPrismaError(error)) return new LanguagesAlreadyExistsException()
    if (isNotFoundPrismaError(error)) return new LanguagesNotFoundException()
    return otherwise === 'invalid-data' ? new InvalidLanguagesDataException() : error
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
    const defaultLanguages = [
      { id: 1, name: 'Tiếng Việt', code: 'vi' },
      { id: 2, name: 'English', code: 'en' },
      { id: 3, name: '日本語', code: 'ja' }
    ]

    for (const language of defaultLanguages) {
      const existing = await this.languagesRepository.findByCode(language.code)
      if (!existing) {
        await this.languagesRepository.create(language)
        this.logger.log(`Created default language ${language.code} (id ${language.id})`)
      }
    }
  }

  // ---- Narrow lookups for other modules (module-boundary plan R1/R2) ----
  // Same results as the repo methods they replace: no message, no throw.

  getIdByCode(code: string): Promise<number | null> {
    return this.languagesRepository.getIdByCode(code)
  }

  getWithListCode(codes: string[]) {
    return this.languagesRepository.getWithListCode(codes)
  }

  getWithListId(ids: number[]) {
    return this.languagesRepository.getWithListId(ids)
  }

  // The language row, or null (findById/findByCode above answer the HTTP routes)
  getById(id: number) {
    return this.languagesRepository.findById(id)
  }

  getByCode(code: string) {
    return this.languagesRepository.findByCode(code)
  }
}
