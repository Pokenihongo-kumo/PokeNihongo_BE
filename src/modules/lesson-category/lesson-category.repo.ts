import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  CreateLessonCategoryBodyType,
  UpdateLessonCategoryBodyType,
  GetLessonCategoryListQueryType
} from './entities/lesson-category.entities'

@Injectable()
export class LessonCategoryRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: GetLessonCategoryListQueryType) {
    const { page, limit, search } = params
    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { nameKey: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [data, total] = await Promise.all([
      this.prismaService.lessonCategory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prismaService.lessonCategory.count({ where })
    ])

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async findById(id: number) {
    return this.prismaService.lessonCategory.findUnique({
      where: { id },
      include: {
        lessons: {
          select: {
            id: true,
            slug: true,
            titleKey: true,
            isPublished: true
          },
          orderBy: {
            lessonOrder: 'asc'
          }
        }
      }
    })
  }

  async findBySlug(slug: string) {
    return this.prismaService.lessonCategory.findUnique({
      where: { slug },
      include: {
        lessons: {
          select: {
            id: true,
            slug: true,
            titleKey: true,
            isPublished: true
          },
          orderBy: {
            lessonOrder: 'asc'
          }
        }
      }
    })
  }

  async create(data: CreateLessonCategoryBodyType & { id?: number; slug: string }) {
    // Remove id from data if it exists since Prisma doesn't allow explicit id for auto-increment
    const { id, ...createData } = data

    return this.prismaService.lessonCategory.create({
      data: createData,
      include: {
        lessons: {
          select: {
            id: true,
            slug: true,
            titleKey: true,
            isPublished: true
          }
        }
      }
    })
  }

  async update(id: number, data: UpdateLessonCategoryBodyType) {
    return this.prismaService.lessonCategory.update({
      where: { id },
      data,
      include: {
        lessons: {
          select: {
            id: true,
            slug: true,
            titleKey: true,
            isPublished: true
          }
        }
      }
    })
  }

  async delete(id: number) {
    return this.prismaService.lessonCategory.delete({
      where: { id }
    })
  }

  // Helper methods
  async checkCategoryExists(id: number) {
    const count = await this.prismaService.lessonCategory.count({
      where: { id }
    })
    return count > 0
  }

  async checkSlugExists(slug: string, excludeId?: number) {
    const where: any = { slug }
    if (excludeId) {
      where.id = { not: excludeId }
    }

    const count = await this.prismaService.lessonCategory.count({ where })
    return count > 0
  }
}
