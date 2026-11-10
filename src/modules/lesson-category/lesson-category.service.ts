import { I18nService } from '@/i18n/i18n.service'
import { LessonCategoryMessage } from '@/i18n/message-keys'
import { toPaginationMeta } from '@/shared/utils/pagination'
import {
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import { LessonCategory } from '@prisma/client'
import { LanguagesRepo } from '../languages/languages.repo'
import { TranslationService } from '../translation/translation.service'
import {
  InvalidLessonCategoryDataException,
  LessonCategoryAlreadyExistsException,
  LessonCategoryNotFoundException
} from './dto/lesson-category.error'
import {
  CreateLessonCategoryBodyType,
  GetLessonCategoryByIdParamsType,
  GetLessonCategoryListQueryType,
  LessonCategoryWithRelationsType,
  UpdateLessonCategoryBodyType
} from './entities/lesson-category.entity'
import { LessonCategoryRepo } from './lesson-category.repo'

// Default names written when a category is created (editable later)
const DEFAULT_NAME = {
  vi: (id: number) => `Danh mục ${id}`,
  en: (id: number) => `Category ${id}`
}

@Injectable()
export class LessonCategoryService {
  private readonly logger = new Logger(LessonCategoryService.name)

  constructor(
    private readonly lessonCategoryRepository: LessonCategoryRepo,
    private readonly translationService: TranslationService,
    private readonly languagesRepo: LanguagesRepo,
    private readonly i18nService: I18nService
  ) {}

  async getLessonCategoryList(
    params: GetLessonCategoryListQueryType,
    lang: string = 'vi'
  ) {
    const result = await this.lessonCategoryRepository.findMany(params)
    const languageId = await this.languagesRepo.getIdByCode(lang)
    const results = await Promise.all(
      result.data.map((item) => this.toView(item, languageId))
    )

    return {
      statusCode: 200,
      message: this.i18nService.translate(LessonCategoryMessage.GET_LIST_SUCCESS, lang),
      data: {
        results,
        pagination: toPaginationMeta(params.page, params.limit, result.total)
      }
    }
  }

  // Also used by LessonService to check that a category exists
  async getLessonCategoryById(
    params: GetLessonCategoryByIdParamsType,
    lang: string = 'vi'
  ) {
    try {
      const category = await this.lessonCategoryRepository.findById(params.id)
      if (!category) {
        throw new LessonCategoryNotFoundException()
      }
      return {
        data: await this.toView(category, await this.languagesRepo.getIdByCode(lang)),
        message: this.i18nService.translate(LessonCategoryMessage.GET_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toLessonCategoryError(error)
    }
  }

  async getLessonCategoryBySlug(slug: string, lang: string = 'vi') {
    try {
      const category = await this.lessonCategoryRepository.findBySlug(slug)
      if (!category) {
        throw new LessonCategoryNotFoundException()
      }
      return {
        data: await this.toView(category, await this.languagesRepo.getIdByCode(lang)),
        message: this.i18nService.translate(LessonCategoryMessage.GET_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toLessonCategoryError(error)
    }
  }

  async createLessonCategory(data: CreateLessonCategoryBodyType, lang: string = 'vi') {
    try {
      // Auto-generate slug if not provided; append -1, -2... while taken
      let slug = data.slug || this.generateSlug(data.nameKey)
      if (await this.lessonCategoryRepository.checkSlugExists(slug)) {
        let counter = 1
        while (
          await this.lessonCategoryRepository.checkSlugExists(`${slug}-${counter}`)
        ) {
          counter++
        }
        slug = `${slug}-${counter}`
      }

      const category = await this.lessonCategoryRepository.create({ ...data, slug })

      // Best effort: the category is saved even if its default names fail
      try {
        await this.createTranslationKeys(category.id, data.nameKey)
      } catch (translationError) {
        this.logger.warn(
          `Failed to create translation keys for lesson category ${category.id}`,
          translationError
        )
      }

      return {
        data: category,
        message: this.i18nService.translate(LessonCategoryMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toLessonCategoryError(error)
    }
  }

  async updateLessonCategory(
    id: number,
    data: UpdateLessonCategoryBodyType,
    lang: string = 'vi'
  ) {
    try {
      if (!(await this.lessonCategoryRepository.checkCategoryExists(id))) {
        throw new LessonCategoryNotFoundException()
      }
      if (
        data.slug &&
        (await this.lessonCategoryRepository.checkSlugExists(data.slug, id))
      ) {
        throw new LessonCategoryAlreadyExistsException()
      }

      const category = await this.lessonCategoryRepository.update(id, data)
      return {
        data: category,
        message: this.i18nService.translate(LessonCategoryMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toLessonCategoryError(error)
    }
  }

  async deleteLessonCategory(id: number, lang: string = 'vi') {
    try {
      if (!(await this.lessonCategoryRepository.checkCategoryExists(id))) {
        throw new LessonCategoryNotFoundException()
      }
      await this.lessonCategoryRepository.delete(id)
      return {
        message: this.i18nService.translate(LessonCategoryMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toLessonCategoryError(error)
    }
  }

  /**
   * Error to answer, decided by type (not message text): our HTTP errors pass
   * through, Prisma unique/not-found become 409/404, anything else is the
   * generic "invalid data" 400 every method answered before.
   */
  private toLessonCategoryError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'Lesson category request failed',
      error instanceof Error ? error.stack : error
    )
    if (isUniqueConstraintPrismaError(error))
      return new LessonCategoryAlreadyExistsException()
    if (isNotFoundPrismaError(error)) return new LessonCategoryNotFoundException()
    return new InvalidLessonCategoryDataException()
  }

  // Name translated for the request language, falling back to the nameKey
  private async toView(
    category: LessonCategory,
    languageId: number | null
  ): Promise<LessonCategoryWithRelationsType> {
    let name = category.nameKey
    if (languageId) {
      try {
        const translation = await this.translationService.findByKeyAndLanguage(
          category.nameKey,
          languageId
        )
        if (translation?.value) name = translation.value
      } catch (error) {
        this.logger.warn(`Failed to get translation for ${category.nameKey}`, error)
      }
    }
    return {
      id: category.id,
      slug: category.slug,
      name,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }
  }

  /**
   * Tạo slug từ nameKey
   */
  private generateSlug(nameKey: string): string {
    // Extract meaningful part from nameKey (remove prefix like "category.")
    return nameKey
      .replace(/^category\./, '') // Remove "category." prefix
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
  }

  // Language ids looked up by code; they used to be hard-coded as vi = 1, en = 2
  private async languageIds(): Promise<Record<string, number>> {
    const languages = await this.languagesRepo.getWithListCode(['vi', 'en'])
    return Object.fromEntries(languages.map((l) => [l.code, l.id]))
  }

  /**
   * Tự động tạo translation keys cho lesson category
   */
  private async createTranslationKeys(categoryId: number, nameKey: string) {
    const ids = await this.languageIds()
    await Promise.all(
      (['vi', 'en'] as const)
        .filter((code) => ids[code])
        .map((code) =>
          this.translationService
            .create({
              key: nameKey,
              languageId: ids[code],
              value: DEFAULT_NAME[code](categoryId)
            })
            .catch((error) => {
              this.logger.warn(
                `Failed to create ${code} translation for ${nameKey}`,
                error
              )
            })
        )
    )
  }

  /**
   * Tạo các lesson categories mặc định
   */
  async createDefaultLessonCategories(lang: string = 'vi') {
    const defaultCategories = [
      {
        nameKey: 'category.jlpt_n5',
        slug: 'jlpt-n5',
        vi: 'Trình độ JLPT N5',
        en: 'JLPT N5 Level'
      },
      {
        nameKey: 'category.jlpt_n4',
        slug: 'jlpt-n4',
        vi: 'Trình độ JLPT N4',
        en: 'JLPT N4 Level'
      },
      {
        nameKey: 'category.jlpt_n3',
        slug: 'jlpt-n3',
        vi: 'Trình độ JLPT N3',
        en: 'JLPT N3 Level'
      },
      {
        nameKey: 'category.jlpt_n2',
        slug: 'jlpt-n2',
        vi: 'Trình độ JLPT N2',
        en: 'JLPT N2 Level'
      },
      {
        nameKey: 'category.jlpt_n1',
        slug: 'jlpt-n1',
        vi: 'Trình độ JLPT N1',
        en: 'JLPT N1 Level'
      },
      {
        nameKey: 'category.reading',
        slug: 'reading',
        vi: 'Luyện đọc',
        en: 'Reading Practice'
      },
      {
        nameKey: 'category.listening',
        slug: 'listening',
        vi: 'Luyện nghe',
        en: 'Listening Practice'
      },
      {
        nameKey: 'category.speaking',
        slug: 'speaking',
        vi: 'Luyện nói',
        en: 'Speaking Practice'
      }
    ]

    try {
      const ids = await this.languageIds()
      const results: LessonCategory[] = []

      for (const item of defaultCategories) {
        try {
          if (await this.lessonCategoryRepository.findBySlug(item.slug)) continue

          const category = await this.lessonCategoryRepository.create({
            nameKey: item.nameKey,
            slug: item.slug
          })
          for (const code of ['vi', 'en'] as const) {
            if (!ids[code]) continue
            try {
              await this.translationService.create({
                key: item.nameKey,
                languageId: ids[code],
                value: item[code]
              })
            } catch (translationError) {
              this.logger.warn(
                `Failed to create ${code} name for ${item.nameKey}`,
                translationError
              )
            }
          }
          results.push(category)
        } catch (error) {
          this.logger.error(`Failed to create category ${item.slug}`, error)
        }
      }

      return {
        data: results,
        page: 1,
        limit: results.length,
        total: results.length,
        totalPages: 1,
        message: this.i18nService.translate(
          LessonCategoryMessage.CREATE_DEFAULT_SUCCESS,
          lang
        )
      }
    } catch (error) {
      this.logger.error('Error creating default lesson categories', error)
      throw new InvalidLessonCategoryDataException()
    }
  }
}
