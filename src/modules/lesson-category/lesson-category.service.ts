import { Injectable, Logger } from '@nestjs/common'
import {
  CreateLessonCategoryBodyType,
  UpdateLessonCategoryBodyType,
  GetLessonCategoryByIdParamsType,
  GetLessonCategoryListQueryType
} from './entities/lesson-category.entities'
import {
  LessonCategoryNotFoundException,
  LessonCategoryAlreadyExistsException,
  InvalidLessonCategoryDataException
} from './dto/lesson-category.error'
import { LessonCategoryRepository } from './lesson-category.repo'
import { TranslationService } from '../translation/translation.service'
import { LanguagesService } from '../languages/languages.service'
import { I18nService } from '@/i18n/i18n.service'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'

@Injectable()
export class LessonCategoryService {
  private readonly logger = new Logger(LessonCategoryService.name)

  constructor(
    private readonly lessonCategoryRepository: LessonCategoryRepository,
    private readonly translationService: TranslationService,
    private readonly languagesService: LanguagesService,
    private readonly i18nService: I18nService
  ) {}

  async getLessonCategoryList(
    params: GetLessonCategoryListQueryType,
    lang: string = 'vi'
  ) {
    try {
      this.logger.log('Getting lesson category list with params:', params)

      const result = await this.lessonCategoryRepository.findMany(params)

      // Resolve translation values for nameKey per requested language
      let languageId: number | undefined
      try {
        this.logger.log(`Looking up language for code: ${lang}`)
        const language = await this.languagesService.findByCode({ code: lang })
        languageId = language?.data?.id
        this.logger.log(`Found languageId: ${languageId}`)
      } catch (error) {
        this.logger.warn(`Failed to find language for code ${lang}:`, error)
        languageId = undefined
      }

      const resultsWithName = await Promise.all(
        result.data.map(async (item) => {
          let translatedName = item.nameKey // Fallback to nameKey

          if (languageId) {
            try {
              const translation = await this.translationService.findByKeyAndLanguage(
                item.nameKey,
                languageId
              )
              if (translation?.value) {
                translatedName = translation.value
              }
            } catch (translationError) {
              this.logger.warn(
                `Failed to get translation for ${item.nameKey}:`,
                translationError
              )
            }
          }

          return {
            id: item.id,
            slug: item.slug,
            name: translatedName,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          }
        })
      )

      this.logger.log(`Found ${result.data.length} lesson categories`)
      return {
        statusCode: 200,
        message: 'Lấy danh sách danh mục bài học thành công',
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
      this.logger.error('Error getting lesson category list:', error)
      this.logger.error('Error details:', JSON.stringify(error, null, 2))
      throw error
    }
  }

  async getLessonCategoryById(params: GetLessonCategoryByIdParamsType) {
    try {
      this.logger.log(`Getting lesson category by id: ${params.id}`)

      const category = await this.lessonCategoryRepository.findById(params.id)

      if (!category) {
        throw new LessonCategoryNotFoundException()
      }

      this.logger.log(`Found lesson category: ${category.slug}`)
      return {
        data: category,
        message: 'Lấy thông tin danh mục bài học thành công'
      }
    } catch (error) {
      this.logger.error(`Error getting lesson category by id ${params.id}:`, error)

      if (error instanceof LessonCategoryNotFoundException) {
        throw error
      }

      throw new InvalidLessonCategoryDataException(
        'Lỗi khi lấy thông tin danh mục bài học'
      )
    }
  }

  async getLessonCategoryBySlug(slug: string) {
    try {
      this.logger.log(`Getting lesson category by slug: ${slug}`)

      const category = await this.lessonCategoryRepository.findBySlug(slug)

      if (!category) {
        throw new LessonCategoryNotFoundException()
      }

      this.logger.log(`Found lesson category: ${category.slug}`)
      return {
        data: category,
        message: 'Lấy thông tin danh mục bài học thành công'
      }
    } catch (error) {
      this.logger.error(`Error getting lesson category by slug ${slug}:`, error)

      if (error instanceof LessonCategoryNotFoundException) {
        throw error
      }

      throw new InvalidLessonCategoryDataException(
        'Lỗi khi lấy thông tin danh mục bài học'
      )
    }
  }

  async createLessonCategory(data: CreateLessonCategoryBodyType) {
    try {
      this.logger.log('Creating lesson category with data:', data)

      // Auto-generate slug if not provided
      let slug = data.slug
      if (!slug) {
        slug = this.generateSlug(data.nameKey)
      }

      // Check if slug already exists
      const slugExists = await this.lessonCategoryRepository.checkSlugExists(slug)
      if (slugExists) {
        // If slug exists, append a number
        let counter = 1
        let newSlug = `${slug}-${counter}`
        while (await this.lessonCategoryRepository.checkSlugExists(newSlug)) {
          counter++
          newSlug = `${slug}-${counter}`
        }
        slug = newSlug
      }

      const category = await this.lessonCategoryRepository.create({
        ...data,
        slug
      })

      // Tự động tạo translation keys
      try {
        await this.createTranslationKeys(category.id, data.nameKey)
        this.logger.log(`Translation keys created for lesson category: ${category.id}`)
      } catch (translationError) {
        this.logger.warn(
          `Failed to create translation keys for lesson category ${category.id}:`,
          translationError
        )
        // Không throw error vì category đã tạo thành công
      }

      this.logger.log(`Created lesson category: ${category.slug}`)
      return {
        data: category,
        message: 'Tạo danh mục bài học thành công'
      }
    } catch (error) {
      this.logger.error('Error creating lesson category:', error)

      if (error instanceof LessonCategoryAlreadyExistsException) {
        throw error
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new LessonCategoryAlreadyExistsException()
      }

      throw new InvalidLessonCategoryDataException('Lỗi khi tạo danh mục bài học')
    }
  }

  async updateLessonCategory(id: number, data: UpdateLessonCategoryBodyType) {
    try {
      this.logger.log(`Updating lesson category ${id} with data:`, data)

      // Check if category exists
      const categoryExists = await this.lessonCategoryRepository.checkCategoryExists(id)
      if (!categoryExists) {
        throw new LessonCategoryNotFoundException()
      }

      // Check if slug already exists (excluding current category)
      if (data.slug) {
        const slugExists = await this.lessonCategoryRepository.checkSlugExists(
          data.slug,
          id
        )
        if (slugExists) {
          throw new LessonCategoryAlreadyExistsException()
        }
      }

      const category = await this.lessonCategoryRepository.update(id, data)

      this.logger.log(`Updated lesson category: ${category.slug}`)
      return {
        data: category,
        message: 'Cập nhật danh mục bài học thành công'
      }
    } catch (error) {
      this.logger.error(`Error updating lesson category ${id}:`, error)

      if (
        error instanceof LessonCategoryNotFoundException ||
        error instanceof LessonCategoryAlreadyExistsException
      ) {
        throw error
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new LessonCategoryAlreadyExistsException()
      }

      throw new InvalidLessonCategoryDataException('Lỗi khi cập nhật danh mục bài học')
    }
  }

  async deleteLessonCategory(id: number) {
    try {
      this.logger.log(`Deleting lesson category ${id}`)

      // Check if category exists
      const categoryExists = await this.lessonCategoryRepository.checkCategoryExists(id)
      if (!categoryExists) {
        throw new LessonCategoryNotFoundException()
      }

      await this.lessonCategoryRepository.delete(id)

      this.logger.log(`Deleted lesson category ${id}`)
      return {
        message: 'Xóa danh mục bài học thành công'
      }
    } catch (error) {
      this.logger.error(`Error deleting lesson category ${id}:`, error)

      if (error instanceof LessonCategoryNotFoundException) {
        throw error
      }

      if (isNotFoundPrismaError(error)) {
        throw new LessonCategoryNotFoundException()
      }

      throw new InvalidLessonCategoryDataException('Lỗi khi xóa danh mục bài học')
    }
  }

  /**
   * Tạo slug từ nameKey
   */
  private generateSlug(nameKey: string): string {
    // Extract meaningful part from nameKey (remove prefix like "category.")
    const cleanTitle = nameKey
      .replace(/^category\./, '') // Remove "category." prefix
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()

    return cleanTitle
  }

  /**
   * Tự động tạo translation keys cho lesson category
   */
  private async createTranslationKeys(categoryId: number, nameKey: string) {
    try {
      const vietnameseTranslation = {
        key: nameKey,
        languageId: 1, // Vietnamese
        value: `Danh mục ${categoryId}` // Default text, có thể cập nhật sau
      }

      const englishTranslation = {
        key: nameKey,
        languageId: 2, // English
        value: `Category ${categoryId}` // Default text, có thể cập nhật sau
      }

      // Tạo tất cả translations
      await Promise.all([
        this.translationService.create(vietnameseTranslation).catch((error) => {
          this.logger.warn(
            `Failed to create Vietnamese translation for ${nameKey}:`,
            error
          )
        }),
        this.translationService.create(englishTranslation).catch((error) => {
          this.logger.warn(`Failed to create English translation for ${nameKey}:`, error)
        })
      ])

      this.logger.log(
        `Translation keys created successfully for lesson category ${categoryId}`
      )
    } catch (error) {
      this.logger.error(
        `Error creating translation keys for lesson category ${categoryId}:`,
        error
      )
      throw error
    }
  }

  /**
   * Tạo các lesson categories mặc định
   */
  async createDefaultLessonCategories() {
    try {
      this.logger.log('Creating default lesson categories...')

      const defaultCategories = [
        {
          id: 1,
          nameKey: 'category.jlpt_n5',
          slug: 'jlpt-n5'
        },
        {
          id: 2,
          nameKey: 'category.jlpt_n4',
          slug: 'jlpt-n4'
        },
        {
          id: 3,
          nameKey: 'category.jlpt_n3',
          slug: 'jlpt-n3'
        },
        {
          id: 4,
          nameKey: 'category.jlpt_n2',
          slug: 'jlpt-n2'
        },
        {
          id: 5,
          nameKey: 'category.jlpt_n1',
          slug: 'jlpt-n1'
        },
        {
          id: 6,
          nameKey: 'category.reading',
          slug: 'reading'
        },
        {
          id: 7,
          nameKey: 'category.listening',
          slug: 'listening'
        },
        {
          id: 8,
          nameKey: 'category.speaking',
          slug: 'speaking'
        }
      ]

      const translations = [
        // JLPT N5
        { key: 'category.jlpt_n5', languageId: 1, value: 'Trình độ JLPT N5' },
        { key: 'category.jlpt_n5', languageId: 2, value: 'JLPT N5 Level' },

        // JLPT N4
        { key: 'category.jlpt_n4', languageId: 1, value: 'Trình độ JLPT N4' },
        { key: 'category.jlpt_n4', languageId: 2, value: 'JLPT N4 Level' },

        // JLPT N3
        { key: 'category.jlpt_n3', languageId: 1, value: 'Trình độ JLPT N3' },
        { key: 'category.jlpt_n3', languageId: 2, value: 'JLPT N3 Level' },

        // JLPT N2
        { key: 'category.jlpt_n2', languageId: 1, value: 'Trình độ JLPT N2' },
        { key: 'category.jlpt_n2', languageId: 2, value: 'JLPT N2 Level' },

        // JLPT N1
        { key: 'category.jlpt_n1', languageId: 1, value: 'Trình độ JLPT N1' },
        { key: 'category.jlpt_n1', languageId: 2, value: 'JLPT N1 Level' },

        // Reading
        { key: 'category.reading', languageId: 1, value: 'Luyện đọc' },
        { key: 'category.reading', languageId: 2, value: 'Reading Practice' },

        // Listening
        { key: 'category.listening', languageId: 1, value: 'Luyện nghe' },
        { key: 'category.listening', languageId: 2, value: 'Listening Practice' },

        // Speaking
        { key: 'category.speaking', languageId: 1, value: 'Luyện nói' },
        { key: 'category.speaking', languageId: 2, value: 'Speaking Practice' }
      ]

      const results: any[] = []

      // Tạo từng category
      for (const categoryData of defaultCategories) {
        try {
          // Kiểm tra xem category đã tồn tại chưa
          const existingCategory = await this.lessonCategoryRepository.findBySlug(
            categoryData.slug
          )
          if (existingCategory) {
            this.logger.log(
              `Category with slug ${categoryData.slug} already exists, skipping...`
            )
            continue
          }

          // Tạo category
          const category = await this.lessonCategoryRepository.create(categoryData)

          // Tạo translations cho category này
          const categoryTranslations = translations.filter(
            (t) => t.key === categoryData.nameKey
          )
          for (const translation of categoryTranslations) {
            try {
              await this.translationService.create(translation)
            } catch (translationError) {
              this.logger.warn(
                `Failed to create translation for ${translation.key} (languageId: ${translation.languageId}):`,
                translationError
              )
            }
          }

          results.push(category)
          this.logger.log(`Created default category: ${category.slug}`)
        } catch (error) {
          this.logger.error(`Failed to create category ${categoryData.slug}:`, error)
        }
      }

      this.logger.log(`Successfully created ${results.length} default lesson categories`)
      return {
        data: results,
        page: 1,
        limit: results.length,
        total: results.length,
        totalPages: 1,
        message: `Tạo thành công ${results.length} danh mục bài học mặc định`
      }
    } catch (error) {
      this.logger.error('Error creating default lesson categories:', error)
      throw new InvalidLessonCategoryDataException(
        'Lỗi khi tạo danh mục bài học mặc định'
      )
    }
  }
}
