import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { GetLessonListQueryType } from './entities/lesson.entity'
import { toSkipTake } from '@/shared/utils/pagination'
import { Prisma } from '@prisma/client'

// Category, author and test returned with a lesson
const withRelations = {
  lessonCategory: { select: { id: true, nameKey: true, slug: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  test: { select: { id: true } }
} satisfies Prisma.LessonInclude

// The title lives in translations under lesson.{id}.title
export const titleKeyOf = (id: number) => `lesson.${id}.title`

@Injectable()
export class LessonRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: GetLessonListQueryType) {
    const { currentPage, pageSize, search, lessonCategoryId, levelJlpt, isPublished } =
      params
    const where: Prisma.LessonWhereInput = {
      ...(search && {
        OR: [
          { slug: { contains: search, mode: 'insensitive' } },
          { titleKey: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(lessonCategoryId && { lessonCategoryId }),
      ...(levelJlpt && { levelJlpt }),
      ...(isPublished !== undefined && { isPublished })
    }
    const [data, total] = await Promise.all([
      this.prismaService.lesson.findMany({
        where,
        include: withRelations,
        orderBy: { [params.sortBy]: params.sort },
        ...toSkipTake(currentPage, pageSize)
      }),
      this.prismaService.lesson.count({ where })
    ])
    return { data, total }
  }

  // Also used by lesson-content and user-test-attempt
  findById(id: number) {
    return this.prismaService.lesson.findUnique({ where: { id }, include: withRelations })
  }

  // Used by user-test-attempt
  findByTestId(testId: number) {
    return this.prismaService.lesson.findFirst({
      where: { testId },
      select: { id: true }
    })
  }

  findBySlug(slug: string) {
    return this.prismaService.lesson.findUnique({
      where: { slug },
      include: withRelations
    })
  }

  // Inserts the lesson, sets its slug/titleKey from the id and writes the
  // title translations, in one transaction
  createWithTitle(
    data: Omit<Prisma.LessonUncheckedCreateInput, 'slug' | 'titleKey'>,
    titles: { languageId: number; value: string }[]
  ) {
    return this.prismaService.$transaction(async (tx) => {
      const temp = `lesson-temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const created = await tx.lesson.create({
        data: {
          ...data,
          slug: temp,
          titleKey: temp,
          publishedAt: data.isPublished ? new Date() : null
        }
      })
      const titleKey = titleKeyOf(created.id)
      await tx.lesson.update({
        where: { id: created.id },
        data: { slug: `lesson-${created.id}`, titleKey }
      })
      for (const title of titles) {
        await tx.translation.upsert({
          where: { languageId_key: { languageId: title.languageId, key: titleKey } },
          update: { value: title.value },
          create: { languageId: title.languageId, key: titleKey, value: title.value }
        })
      }
      return tx.lesson.findUniqueOrThrow({
        where: { id: created.id },
        include: withRelations
      })
    })
  }

  // Publishing sets publishedAt the first time; unpublishing clears it.
  // Title translations, when given, are written in the same transaction
  async update(
    id: number,
    data: Prisma.LessonUncheckedUpdateInput,
    titles: { languageId: number; value: string }[] = []
  ) {
    let publishedAt: Date | null | undefined
    if (data.isPublished === false) publishedAt = null
    if (data.isPublished === true) {
      const current = await this.prismaService.lesson.findUnique({
        where: { id },
        select: { isPublished: true, publishedAt: true }
      })
      if (current && !current.isPublished && !current.publishedAt)
        publishedAt = new Date()
    }
    return this.prismaService.$transaction(async (tx) => {
      const lesson = await tx.lesson.update({
        where: { id },
        data: { ...data, ...(publishedAt !== undefined && { publishedAt }) },
        include: withRelations
      })
      for (const title of titles) {
        await tx.translation.upsert({
          where: {
            languageId_key: { languageId: title.languageId, key: lesson.titleKey }
          },
          update: { value: title.value },
          create: {
            languageId: title.languageId,
            key: lesson.titleKey,
            value: title.value
          }
        })
      }
      return lesson
    })
  }

  delete(id: number) {
    return this.prismaService.lesson.delete({ where: { id } })
  }

  // The title of each key, in one language or in all of them
  titles(keys: string[], languageId?: number) {
    return this.prismaService.translation.findMany({
      where: { key: { in: keys }, ...(languageId && { languageId }) },
      select: { key: true, value: true, language: { select: { code: true } } }
    })
  }

  async categoryExists(id: number) {
    return (await this.prismaService.lessonCategory.count({ where: { id } })) > 0
  }

  async testExists(id: number) {
    return (await this.prismaService.test.count({ where: { id } })) > 0
  }

  countRewards(ids: number[]) {
    return this.prismaService.reward.count({ where: { id: { in: ids } } })
  }

  // 0 for an empty category
  async maxLessonOrder(lessonCategoryId: number): Promise<number> {
    const { _max } = await this.prismaService.lesson.aggregate({
      where: { lessonCategoryId },
      _max: { lessonOrder: true }
    })
    return _max.lessonOrder ?? 0
  }
}
