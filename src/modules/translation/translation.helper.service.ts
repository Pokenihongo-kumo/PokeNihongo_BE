import { Injectable, Logger } from '@nestjs/common'
import { TranslationService } from './translation.service'
import { LanguagesRepo } from '@/modules/languages/languages.repo'

@Injectable()
export class TranslationHelperService {
  private readonly logger = new Logger(TranslationHelperService.name)

  constructor(
    private readonly translationService: TranslationService,
    private readonly languagesRepository: LanguagesRepo
  ) {}

  /**
   * Convert languageCode to languageId
   */
  private async getLanguageId(languageCode: string): Promise<number> {
    const language = await this.languagesRepository.findByCode(languageCode)
    if (!language) {
      throw new Error(`Language with code '${languageCode}' not found`)
    }
    return language.id
  }

  /**
   * Tạo translations cho một key với nhiều ngôn ngữ
   * @param key - Key định danh (ví dụ: 'lesson.1.title')
   * @param translations - Object chứa translations theo ngôn ngữ
   * @example
   * await createTranslations('lesson.1.title', {
   *   'vi': 'Chào hỏi',
   *   'en': 'Greetings',
   *   'ja': '挨拶'
   * })
   */
  async createTranslations(key: string, translations: Record<string, string>) {
    try {
      this.logger.log(`Creating translations for key: ${key}`)

      // Convert languageCode → languageId
      const translationData = await Promise.all(
        Object.entries(translations).map(async ([languageCode, value]) => ({
          languageId: await this.getLanguageId(languageCode),
          key,
          value
        }))
      )

      const result = await this.translationService.createMany(translationData)
      this.logger.log(`Created ${result.count} translations for key: ${key}`)
      return result
    } catch (error) {
      this.logger.error(`Error creating translations for key ${key}:`, error)
      throw new Error(`Tạo translations cho key ${key} thất bại`)
    }
  }

  /**
   * Lấy translation cho một key và ngôn ngữ cụ thể
   * @param key - Key định danh
   * @param languageCode - Mã ngôn ngữ
   * @returns Translation hoặc null nếu không tìm thấy
   */
  async getTranslation(key: string, languageCode: string): Promise<string | null> {
    try {
      const languageId = await this.getLanguageId(languageCode)
      const translation = await this.translationService.findByKeyAndLanguage(
        key,
        languageId
      )
      return translation?.value || null
    } catch (error) {
      this.logger.error(
        `Error getting translation for key ${key} and language ${languageCode}:`,
        error
      )
      return null
    }
  }

  /**
   * Lấy tất cả translations cho một key
   * @param key - Key định danh
   * @returns Object chứa translations theo ngôn ngữ
   */
  async getTranslationsByKey(key: string): Promise<Record<string, string>> {
    try {
      const result = await this.translationService.findByKey({ key })
      const translations: Record<string, string> = {}

      // Cần load language relation để lấy code
      for (const translation of result.translations) {
        const language = await this.languagesRepository.findById(translation.languageId)
        if (language) {
          translations[language.code] = translation.value
        }
      }

      return translations
    } catch (error) {
      this.logger.error(`Error getting translations for key ${key}:`, error)
      return {}
    }
  }

  /**
   * Cập nhật translation cho một key và ngôn ngữ cụ thể
   * @param key - Key định danh
   * @param languageCode - Mã ngôn ngữ
   * @param value - Giá trị mới
   */
  async updateTranslation(key: string, languageCode: string, value: string) {
    try {
      this.logger.log(`Updating translation for key: ${key}, language: ${languageCode}`)

      const languageId = await this.getLanguageId(languageCode)

      // Kiểm tra translation có tồn tại không
      const existingTranslation = await this.translationService.findByKeyAndLanguage(
        key,
        languageId
      )
      if (existingTranslation) {
        // Cập nhật translation hiện có
        await this.translationService.updateByKeyAndLanguage(key, languageId, { value })
      } else {
        // Tạo translation mới
        await this.translationService.create({ languageId, key, value })
      }

      this.logger.log(
        `Translation updated successfully for key: ${key}, language: ${languageCode}`
      )
    } catch (error) {
      this.logger.error(
        `Error updating translation for key ${key} and language ${languageCode}:`,
        error
      )
      throw new Error(
        `Cập nhật translation cho key ${key} và ngôn ngữ ${languageCode} thất bại`
      )
    }
  }

  /**
   * Xóa tất cả translations cho một key
   * @param key - Key định danh
   */
  async deleteTranslationsByKey(key: string) {
    try {
      this.logger.log(`Deleting all translations for key: ${key}`)
      const result = await this.translationService.deleteByKey(key)
      this.logger.log(`Deleted ${result.count} translations for key: ${key}`)
      return result
    } catch (error) {
      this.logger.error(`Error deleting translations for key ${key}:`, error)
      throw new Error(`Xóa translations cho key ${key} thất bại`)
    }
  }

  /**
   * Tạo key tự động cho các entity
   * @param module - Tên module (ví dụ: 'lesson', 'vocabulary')
   * @param id - ID của entity
   * @param field - Tên field (ví dụ: 'title', 'description')
   * @returns Key được tạo (ví dụ: 'lesson.1.title')
   */
  generateKey(module: string, id: number | string, field: string): string {
    return `${module}.${id}.${field}`
  }

  /**
   * Tạo translations cho một entity mới
   * @param module - Tên module
   * @param id - ID của entity
   * @param field - Tên field
   * @param translations - Object chứa translations theo ngôn ngữ
   */
  async createEntityTranslations(
    module: string,
    id: number | string,
    field: string,
    translations: Record<string, string>
  ) {
    const key = this.generateKey(module, id, field)
    return await this.createTranslations(key, translations)
  }

  /**
   * Lấy translation cho một entity
   * @param module - Tên module
   * @param id - ID của entity
   * @param field - Tên field
   * @param languageCode - Mã ngôn ngữ
   * @returns Translation hoặc null
   */
  async getEntityTranslation(
    module: string,
    id: number | string,
    field: string,
    languageCode: string
  ): Promise<string | null> {
    const key = this.generateKey(module, id, field)
    return await this.getTranslation(key, languageCode)
  }

  /**
   * Lấy tất cả translations cho một entity
   * @param module - Tên module
   * @param id - ID của entity
   * @param field - Tên field
   * @returns Object chứa translations theo ngôn ngữ
   */
  async getEntityTranslations(
    module: string,
    id: number | string,
    field: string
  ): Promise<Record<string, string>> {
    const key = this.generateKey(module, id, field)
    return await this.getTranslationsByKey(key)
  }
}
