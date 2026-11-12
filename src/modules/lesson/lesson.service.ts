import { HttpException, Injectable, Logger } from '@nestjs/common'
import {
  CreateLessonBodyType,
  UpdateLessonBodyType,
  GetLessonListQueryType
} from './entities/lesson.entity'
import {
  InvalidLessonDataException,
  LessonAlreadyExistsException,
  LessonCategoryNotFoundException,
  LessonNotFoundException,
  LessonRewardNotFoundException,
  LessonTestNotFoundException
} from './dto/lesson.error'
import { LessonRepo } from './lesson.repo'
import { LanguagesRepo } from '../languages/languages.repo'
import { I18nService } from '@/i18n/i18n.service'
import { LessonMessage as M } from '@/i18n/message-keys'
import { toPaginationMeta } from '@/shared/utils/pagination'
import {
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/utils/prisma-errors'

type Title = string | { language: string; value: string }[]

@Injectable()
export class LessonService {
  private readonly logger = new Logger(LessonService.name)

  constructor(
    private readonly lessonRepo: LessonRepo,
    private readonly languagesRepo: LanguagesRepo,
    private readonly i18nService: I18nService
  ) {}

  // titleLang (?lang): the title in that language; without it, every translation
  async getLessonList(params: GetLessonListQueryType, lang: string = 'vi') {
    const { data, total } = await this.lessonRepo.findMany(params)
    const titleOf = await this.titlesOf(
      data.map((l) => l.titleKey),
      params.lang
    )
    return {
      statusCode: 200,
      data: {
        results: data.map((lesson) => ({ ...lesson, title: titleOf(lesson.titleKey) })),
        pagination: toPaginationMeta(params.currentPage, params.pageSize, total)
      },
      message: this.i18nService.translate(M.GET_LIST_SUCCESS, lang)
    }
  }

  async getLessonById(id: number, titleLang?: string, lang: string = 'vi') {
    return this.withTitle(await this.lessonRepo.findById(id), titleLang, lang)
  }

  async getLessonBySlug(slug: string, titleLang?: string, lang: string = 'vi') {
    return this.withTitle(await this.lessonRepo.findBySlug(slug), titleLang, lang)
  }

  async createLesson(data: CreateLessonBodyType, userId: number, lang: string = 'vi') {
    try {
      await this.assertReferences(data)
      // The slug is always lesson-{id}
      const { translations, slug: _slug, rewardId, ...fields } = data
      const lesson = await this.lessonRepo.createWithTitle(
        {
          ...fields,
          rewardId: [...new Set(rewardId ?? [])],
          lessonOrder:
            data.lessonOrder ??
            (await this.lessonRepo.maxLessonOrder(data.lessonCategoryId)) + 1,
          createdById: userId
        },
        await this.titleTranslations(data.titleJp, translations?.meaning)
      )
      return {
        statusCode: 201,
        data: lesson,
        message: this.i18nService.translate(M.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toLessonError(error)
    }
  }

  async updateLesson(id: number, data: UpdateLessonBodyType, lang: string = 'vi') {
    try {
      if (!(await this.lessonRepo.findById(id))) throw new LessonNotFoundException()
      await this.assertReferences(data)
      // The slug is always lesson-{id}. translations used to reach Prisma as a
      // column (every update from the web failed); now they rewrite the title
      const { slug: _slug, translations, rewardId, ...fields } = data
      const lesson = await this.lessonRepo.update(
        id,
        {
          ...fields,
          ...(rewardId !== undefined && { rewardId: [...new Set(rewardId)] })
        },
        translations?.meaning?.length
          ? await this.titleTranslations(data.titleJp ?? '', translations.meaning)
          : []
      )
      return {
        statusCode: 200,
        data: lesson,
        message: this.i18nService.translate(M.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      throw this.toLessonError(error)
    }
  }

  async togglePublishLesson(id: number, lang: string = 'vi') {
    try {
      const lesson = await this.lessonRepo.findById(id)
      if (!lesson) throw new LessonNotFoundException()
      const updated = await this.lessonRepo.update(id, {
        isPublished: !lesson.isPublished
      })
      return {
        statusCode: 200,
        data: updated,
        message: this.i18nService.translate(
          updated.isPublished ? M.PUBLISH_SUCCESS : M.UNPUBLISH_SUCCESS,
          lang
        )
      }
    } catch (error) {
      throw this.toLessonError(error)
    }
  }

  async deleteLesson(id: number, lang: string = 'vi') {
    try {
      await this.lessonRepo.delete(id)
      return { message: this.i18nService.translate(M.DELETE_SUCCESS, lang) }
    } catch (error) {
      throw this.toLessonError(error)
    }
  }

  //#region helpers
  private async withTitle(
    lesson: Awaited<ReturnType<LessonRepo['findById']>>,
    titleLang: string | undefined,
    lang: string
  ) {
    if (!lesson) throw new LessonNotFoundException()
    const titleOf = await this.titlesOf([lesson.titleKey], titleLang)
    return {
      statusCode: 200,
      data: { ...lesson, title: titleOf(lesson.titleKey) },
      message: this.i18nService.translate(M.GET_SUCCESS, lang)
    }
  }

  // One query for every title. With a known language: that translation (or '');
  // otherwise all of them as [{ language: code, value }] (was lang_{languageId})
  private async titlesOf(keys: string[], titleLang?: string) {
    const languageId = titleLang ? await this.languagesRepo.getIdByCode(titleLang) : null
    const rows = keys.length
      ? await this.lessonRepo.titles(keys, languageId ?? undefined)
      : []
    return (key: string): Title => {
      const own = rows.filter((r) => r.key === key)
      return languageId
        ? (own[0]?.value ?? '')
        : own.map((r) => ({ language: r.language.code, value: r.value }))
    }
  }

  // The given translations by language code (unknown codes are skipped), else
  // titleJp in vi and en. Language ids come from the DB (were fixed 1/2/3)
  private async titleTranslations(
    titleJp: string,
    meaning?: { language_code: string; value: string }[]
  ) {
    const items = meaning?.length
      ? meaning
      : ['vi', 'en'].map((code) => ({ language_code: code, value: titleJp }))
    const languages = await this.languagesRepo.getWithListCode(
      items.map((t) => t.language_code)
    )
    const idOf = new Map(languages.map((l) => [l.code, l.id]))
    return items.flatMap((t) => {
      const languageId = idOf.get(t.language_code)
      return languageId ? [{ languageId, value: t.value }] : []
    })
  }

  // The category, test and rewards a body points to must exist
  private async assertReferences(data: {
    lessonCategoryId?: number
    testId?: number | null
    rewardId?: number[]
  }) {
    if (
      data.lessonCategoryId &&
      !(await this.lessonRepo.categoryExists(data.lessonCategoryId))
    ) {
      throw new LessonCategoryNotFoundException()
    }
    if (data.testId && !(await this.lessonRepo.testExists(data.testId))) {
      throw new LessonTestNotFoundException()
    }
    const rewards = [...new Set(data.rewardId ?? [])]
    if (
      rewards.length > 0 &&
      (await this.lessonRepo.countRewards(rewards)) !== rewards.length
    ) {
      throw new LessonRewardNotFoundException()
    }
  }

  private toLessonError(error: unknown): HttpException {
    if (error instanceof HttpException) return error
    this.logger.error(
      'Lesson request failed',
      error instanceof Error ? error.stack : error
    )
    if (isUniqueConstraintPrismaError(error)) return new LessonAlreadyExistsException()
    if (isNotFoundPrismaError(error)) return new LessonNotFoundException()
    return new InvalidLessonDataException()
  }
  //#endregion
}
