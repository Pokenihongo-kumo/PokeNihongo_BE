import {
  CreateWordTypeBodyType,
  UpdateWordTypeBodyType,
  GetWordTypeListQueryType,
  WordType
} from './entities/wordtype.entities'

import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { WordTypeRepository } from './wordtype.repo'
import {
  WordTypeNotFoundException,
  WordTypeAlreadyExistsException,
  InvalidWordTypeDataException
} from './dto/wordtype.error'
import { TranslationService } from '@/modules/translation/translation.service'
import { LanguagesService } from '@/modules/languages/languages.service'
import { I18nService } from '@/i18n/i18n.service'
import { WordTypeMessage } from '@/i18n/message-keys'

@Injectable()
export class WordTypeService implements OnModuleInit {
  private readonly logger = new Logger(WordTypeService.name)

  constructor(
    private readonly wordTypeRepository: WordTypeRepository,
    private readonly translationService: TranslationService,
    private readonly languagesService: LanguagesService,
    private readonly i18nService: I18nService
  ) {}

  async onModuleInit(): Promise<void> {
    // Best-effort: ensure default word types exist so other modules (imports) don't fail
    try {
      await this.createDefaultWordTypes('vi')
    } catch (error) {
      // Avoid breaking app startup if migration not yet applied; just log
      this.logger.warn(
        'Skip creating default word types on init (might be before migration).',
        error as any
      )
    }
  }

  async findAll(params: GetWordTypeListQueryType, lang: string = 'vi') {
    try {
      this.logger.log(`Finding word types with params: ${JSON.stringify(params)}`)

      // Set default values
      const queryParams = {
        page: params.page || 1,
        limit: params.limit || 10,
        sortBy: params.sortBy as 'id' | 'createdAt' | 'updatedAt' | 'nameKey' | undefined,
        sortOrder: params.sortOrder
      }

      const result = await this.wordTypeRepository.findMany(queryParams)

      // Resolve translation values for nameKey per requested language
      let languageId: number | undefined
      try {
        const language = await this.languagesService.findByCode({ code: lang })
        languageId = language?.data?.id
      } catch {
        languageId = undefined
      }

      const resultsWithName = await Promise.all(
        result.data.map(async (item) => {
          if (!languageId) {
            return {
              id: item.id,
              name: item.nameKey,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            }
          }
          try {
            const translation = await this.translationService.findByKeyAndLanguage(
              item.nameKey,
              languageId as number
            )
            const value = translation?.value || item.nameKey
            return {
              id: item.id,
              name: value,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            }
          } catch {
            return {
              id: item.id,
              name: item.nameKey,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            }
          }
        })
      )

      return {
        statusCode: 200,
        message: this.i18nService.translate(WordTypeMessage.GET_LIST_SUCCESS, lang),
        data: {
          results: resultsWithName,
          pagination: {
            current: result.page,
            pageSize: result.limit,
            totalPage: result.totalPages,
            totalItem: result.total
          }
        }
      }
    } catch (error) {
      this.logger.error('Error finding word types:', error)
      throw error
    }
  }

  async findById(id: number, lang: string = 'vi') {
    try {
      this.logger.log(`Finding word type by id: ${id}`)
      const wordType = await this.wordTypeRepository.findById(id)

      if (!wordType) {
        throw WordTypeNotFoundException
      }

      return {
        data: wordType,
        message: this.i18nService.translate(WordTypeMessage.GET_SUCCESS, lang)
      }
    } catch (error) {
      this.logger.error('Error finding word type by id:', error)
      throw error
    }
  }

  async findByNameKey(nameKey: string, lang: string = 'vi') {
    try {
      this.logger.log(`Finding word type by name key: ${nameKey}`)
      const wordType = await this.wordTypeRepository.findByNameKey(nameKey)

      if (!wordType) {
        throw WordTypeNotFoundException
      }

      return {
        data: wordType,
        message: this.i18nService.translate(WordTypeMessage.GET_SUCCESS, lang)
      }
    } catch (error) {
      this.logger.error('Error finding word type by name key:', error)
      throw error
    }
  }

  async create(data: CreateWordTypeBodyType, lang: string = 'vi') {
    try {
      this.logger.log(`Creating word type with nameKey: ${data.nameKey}`)

      // Kiểm tra nameKey đã tồn tại chưa
      const existingWordType = await this.wordTypeRepository.findByNameKey(data.nameKey)
      if (existingWordType) {
        throw WordTypeAlreadyExistsException
      }

      const wordType = await this.wordTypeRepository.create(data)
      this.logger.log(`Word type created successfully: ${wordType.id}`)
      return {
        data: wordType,
        message: this.i18nService.translate(WordTypeMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      this.logger.error('Error creating word type:', error)
      if (error.message.includes('đã tồn tại')) {
        throw error
      }
      throw InvalidWordTypeDataException
    }
  }

  async update(id: number, data: UpdateWordTypeBodyType, lang: string = 'vi') {
    try {
      this.logger.log(`Updating word type: ${id}`)

      // Kiểm tra word type có tồn tại không
      const existingWordType = await this.wordTypeRepository.findById(id)
      if (!existingWordType) {
        throw WordTypeNotFoundException
      }

      // Nếu có nameKey mới, kiểm tra đã tồn tại chưa
      if (data.nameKey && data.nameKey !== existingWordType.nameKey) {
        const nameKeyExists = await this.wordTypeRepository.existsByNameKey(
          data.nameKey,
          id
        )
        if (nameKeyExists) {
          throw WordTypeAlreadyExistsException
        }
      }

      const wordType = await this.wordTypeRepository.update(id, data)
      this.logger.log(`Word type updated successfully: ${wordType.id}`)
      return {
        data: wordType,
        message: this.i18nService.translate(WordTypeMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      this.logger.error('Error updating word type:', error)
      if (
        error.message.includes('không tồn tại') ||
        error.message.includes('đã tồn tại')
      ) {
        throw error
      }
      throw InvalidWordTypeDataException
    }
  }

  async delete(id: number, lang: string = 'vi') {
    try {
      this.logger.log(`Deleting word type: ${id}`)

      // Kiểm tra word type có tồn tại không
      const existingWordType = await this.wordTypeRepository.findById(id)
      if (!existingWordType) {
        throw WordTypeNotFoundException
      }

      await this.wordTypeRepository.delete(id)
      this.logger.log(`Word type deleted successfully: ${id}`)
      return {
        message: this.i18nService.translate(WordTypeMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      this.logger.error('Error deleting word type:', error)
      if (error.message.includes('không tồn tại')) {
        throw error
      }
      throw InvalidWordTypeDataException
    }
  }

  async getStats(lang: string = 'vi') {
    try {
      this.logger.log('Getting word type statistics')
      const stats = await this.wordTypeRepository.getStats()
      return {
        data: stats,
        message: this.i18nService.translate(WordTypeMessage.GET_STATS_SUCCESS, lang)
      }
    } catch (error) {
      this.logger.error('Error getting word type statistics:', error)
      throw error
    }
  }

  /**
   * Tạo loại từ mặc định nếu chưa có
   */
  async createDefaultWordTypes(lang: string = 'vi') {
    try {
      this.logger.log('Creating default word types')

      const defaultWordTypes = [
        // Loại từ cơ bản
        { id: 1, key: 'noun', translations: { vi: 'danh từ', en: 'noun' } },
        { id: 2, key: 'pronoun', translations: { vi: 'đại từ', en: 'pronoun' } },
        { id: 3, key: 'particle', translations: { vi: 'trợ từ', en: 'particle' } },
        { id: 4, key: 'adverb', translations: { vi: 'trạng từ', en: 'adverb' } },
        { id: 5, key: 'conjunction', translations: { vi: 'liên từ', en: 'conjunction' } },
        {
          id: 6,
          key: 'interjection',
          translations: { vi: 'thán từ', en: 'interjection' }
        },
        { id: 7, key: 'numeral', translations: { vi: 'số từ', en: 'numeral' } },
        { id: 8, key: 'counter', translations: { vi: 'lượng từ', en: 'counter' } },
        { id: 9, key: 'prefix', translations: { vi: 'tiền tố', en: 'prefix' } },
        { id: 10, key: 'suffix', translations: { vi: 'hậu tố', en: 'suffix' } },
        // Tính từ tiếng Nhật
        {
          id: 11,
          key: 'i_adjective',
          translations: { vi: 'tính từ i', en: 'i-adjective' }
        },
        {
          id: 12,
          key: 'na_adjective',
          translations: { vi: 'tính từ na', en: 'na-adjective' }
        },
        {
          id: 13,
          key: 'no_adjective',
          translations: { vi: 'tính từ no', en: 'no-adjective' }
        },
        // Động từ tiếng Nhật
        { id: 14, key: 'verb', translations: { vi: 'động từ', en: 'verb' } },
        {
          id: 15,
          key: 'godan_verb',
          translations: { vi: 'động từ ngũ đoạn', en: 'godan verb' }
        },
        {
          id: 16,
          key: 'ichidan_verb',
          translations: { vi: 'động từ nhất đoạn', en: 'ichidan verb' }
        },
        {
          id: 17,
          key: 'transitive_verb',
          translations: { vi: 'tha động từ', en: 'transitive verb' }
        },
        {
          id: 18,
          key: 'intransitive_verb',
          translations: { vi: 'tự động từ', en: 'intransitive verb' }
        },
        // Từ đặc biệt tiếng Nhật
        {
          id: 19,
          key: 'onomatopoeia',
          translations: { vi: 'từ tượng thanh', en: 'onomatopoeia' }
        },
        {
          id: 20,
          key: 'mimetic_word',
          translations: { vi: 'từ tượng hình', en: 'mimetic word' }
        },
        { id: 21, key: 'honorific', translations: { vi: 'kính ngữ', en: 'honorific' } },
        {
          id: 22,
          key: 'humble',
          translations: { vi: 'khiêm nhường ngữ', en: 'humble form' }
        },
        { id: 23, key: 'polite', translations: { vi: 'lịch sự ngữ', en: 'polite form' } },
        { id: 24, key: 'casual', translations: { vi: 'thân mật ngữ', en: 'casual form' } }
      ]

      for (const wordType of defaultWordTypes) {
        const nameKey = `wordtype.${wordType.key}.name`
        const existing = await this.wordTypeRepository.findByNameKey(nameKey)

        if (!existing) {
          // Tạo word type với ID cụ thể
          await this.wordTypeRepository.create({
            id: wordType.id,
            nameKey
          })
          this.logger.log(`Created default word type with ID ${wordType.id}: ${nameKey}`)

          // Tạo translations cho word type
          await this.createTranslationsForWordType(nameKey, wordType.translations)
        }
      }

      this.logger.log('Default word types creation completed')
      return {
        message: this.i18nService.translate(WordTypeMessage.CREATE_DEFAULT_SUCCESS, lang)
      }
    } catch (error) {
      this.logger.error('Error creating default word types:', error)
      throw InvalidWordTypeDataException
    }
  }

  /**
   * Tạo translations cho word type
   */
  private async createTranslationsForWordType(
    nameKey: string,
    translations: Record<string, string>
  ): Promise<void> {
    try {
      this.logger.log(`Creating translations for word type: ${nameKey}`)

      for (const [langCode, value] of Object.entries(translations)) {
        try {
          // Tìm ngôn ngữ theo code
          const languages = await this.languagesService.findMany({
            currentPage: 1,
            pageSize: 100,
            code: langCode
          })

          if (!languages.data?.results || languages.data.results.length === 0) {
            this.logger.warn(`Language ${langCode} not found, skipping translation`)
            continue
          }

          const language = languages.data.results[0]

          // Kiểm tra translation đã tồn tại chưa
          const existingTranslation = await this.translationService.findByKeyAndLanguage(
            nameKey,
            language.id
          )

          if (!existingTranslation) {
            // Tạo translation mới
            await this.translationService.create({
              key: nameKey,
              languageId: language.id,
              value: value
            })
            this.logger.log(`Created translation for ${nameKey} in ${langCode}: ${value}`)
          } else {
            this.logger.log(`Translation already exists for ${nameKey} in ${langCode}`)
          }
        } catch (error) {
          this.logger.warn(
            `Failed to create translation for ${nameKey} in ${langCode}`,
            error
          )
        }
      }
    } catch (error) {
      this.logger.error(`Error creating translations for word type: ${nameKey}`, error)
      throw error
    }
  }
}
