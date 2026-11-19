import { PrismaService } from '@/shared/services/prisma.service'
import { toSkipTake } from '@/shared/utils/pagination'
import { Injectable } from '@nestjs/common'
import { LessonCategory, Prisma } from '@prisma/client'
import {
  CreateLessonCategoryBody,
  GetLessonCategoryListQuery,
  UpdateLessonCategoryBody
} from './dto/lesson-category.zod-dto'

@Injectable()
export class LessonCategoryRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(
    params: GetLessonCategoryListQuery
  ): Promise<{ data: LessonCategory[]; total: number }> {
    const { page, limit, search } = params

    const where: Prisma.LessonCategoryWhereInput = search
      ? {
          OR: [
            { nameKey: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {}

    const [data, total] = await Promise.all([
      this.prismaService.lessonCategory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake(page, limit)
      }),
      this.prismaService.lessonCategory.count({ where })
    ])

    return { data, total }
  }

  findById(id: number): Promise<LessonCategory | null> {
    return this.prismaService.lessonCategory.findUnique({ where: { id } })
  }

  findBySlug(slug: string): Promise<LessonCategory | null> {
    return this.prismaService.lessonCategory.findUnique({ where: { slug } })
  }

  // Ids always come from the sequence (an `id` in the input is ignored, as before)
  create(
    data: CreateLessonCategoryBody & { id?: number; slug: string }
  ): Promise<LessonCategory> {
    return this.prismaService.lessonCategory.create({
      data: { nameKey: data.nameKey, slug: data.slug }
    })
  }

  update(id: number, data: UpdateLessonCategoryBody): Promise<LessonCategory> {
    return this.prismaService.lessonCategory.update({ where: { id }, data })
  }

  delete(id: number): Promise<LessonCategory> {
    return this.prismaService.lessonCategory.delete({ where: { id } })
  }

  // Helper methods
  async checkCategoryExists(id: number): Promise<boolean> {
    const count = await this.prismaService.lessonCategory.count({ where: { id } })
    return count > 0
  }

  async checkSlugExists(slug: string, excludeId?: number): Promise<boolean> {
    const count = await this.prismaService.lessonCategory.count({
      where: { slug, ...(excludeId && { id: { not: excludeId } }) }
    })
    return count > 0
  }
}
