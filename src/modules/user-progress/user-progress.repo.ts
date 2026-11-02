import { UserProgressType } from '@/modules/user-progress/entities/user-progress.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { ProgressStatus } from '@prisma/client'

@Injectable()
export class UserProgressRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: {
    currentPage: number
    pageSize: number
    userId?: number
    lessonId?: number
    lessonCategoryId?: number
    status?: string
    progressPercentage?: number
  }) {
    const {
      currentPage,
      pageSize,
      userId,
      lessonId,
      lessonCategoryId,
      status,
      progressPercentage
    } = params
    const skip = (currentPage - 1) * pageSize

    const where: any = {}

    if (userId) {
      where.userId = userId
    }

    if (lessonId) {
      where.lessonId = lessonId
    }

    if (lessonCategoryId) {
      where.lesson = {
        lessonCategoryId: lessonCategoryId
      }
    }

    if (status) {
      where.status = status
    }

    if (progressPercentage !== undefined) {
      where.progressPercentage = progressPercentage
    }

    const [items, total] = await Promise.all([
      this.prismaService.userProgress.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { lesson: { lessonOrder: 'asc' } },
        include: {
          lesson: {
            select: {
              id: true,
              slug: true,
              titleJp: true,
              titleKey: true,
              levelJlpt: true,
              estimatedTimeMinutes: true,
              lessonCategoryId: true,
              lessonCategory: {
                select: {
                  id: true,
                  nameKey: true
                }
              }
            }
          }
        }
      }),
      this.prismaService.userProgress.count({ where })
    ])

    return {
      items: items.map((item) => this.transformUserProgress(item)),
      total,
      page: currentPage,
      limit: pageSize
    }
  }

  async findUnique(where: { id?: number }): Promise<UserProgressType | null> {
    if (!where.id) return null

    const result = await this.prismaService.userProgress.findUnique({
      where: { id: where.id },
      include: {
        lesson: {
          select: {
            id: true,
            slug: true,
            titleJp: true,
            titleKey: true,
            levelJlpt: true,
            estimatedTimeMinutes: true
          }
        }
      }
    })
    return result ? this.transformUserProgress(result) : null
  }

  async findByUserAndLesson(
    userId: number,
    lessonId: number
  ): Promise<UserProgressType | null> {
    const result = await this.prismaService.userProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        lesson: {
          select: {
            id: true,
            slug: true,
            titleJp: true,
            titleKey: true,
            levelJlpt: true,
            estimatedTimeMinutes: true
          }
        }
      }
    })
    return result ? this.transformUserProgress(result) : null
  }

  async create(data: {
    userId: number
    lessonId: number
    status?: string
    progressPercentage?: number
  }): Promise<UserProgressType> {
    const result = await this.prismaService.userProgress.create({
      data: {
        userId: data.userId,
        lessonId: data.lessonId,
        status: (data.status || 'NOT_STARTED') as any,
        progressPercentage: data.progressPercentage || 0
      }
    })
    return this.transformUserProgress(result)
  }

  async update(
    where: { id: number },
    data: {
      status?: string
      progressPercentage?: number
      completedAt?: Date | null
      testId?: number | null
    }
  ): Promise<UserProgressType> {
    // Kiểm tra status hiện tại trước khi update
    const currentProgress = await this.prismaService.userProgress.findUnique({
      where,
      select: { status: true }
    })

    // Không update status nếu đã là COMPLETED
    if (currentProgress && currentProgress.status === ProgressStatus.COMPLETED) {
      // Nếu đã COMPLETED, chỉ update các field khác (không update status)
      const updateData: any = { ...data }
      delete updateData.status // Không update status
      updateData.lastAccessedAt = new Date()

      const result = await this.prismaService.userProgress.update({
        where,
        data: updateData
      })
      return this.transformUserProgress(result)
    }

    const updateData: any = { ...data }

    // Nếu status được cập nhật thành COMPLETED, set completedAt
    // So sánh với cả enum và string để tương thích
    if (data.status === ProgressStatus.COMPLETED || data.status === 'COMPLETED') {
      updateData.completedAt = new Date()
    }

    // Cập nhật lastAccessedAt
    updateData.lastAccessedAt = new Date()

    const result = await this.prismaService.userProgress.update({
      where,
      data: updateData
    })
    return this.transformUserProgress(result)
  }

  async updateByUserAndLesson(
    userId: number,
    lessonId: number,
    data: {
      status?: string
      progressPercentage?: number
      testId?: number | null
    }
  ): Promise<UserProgressType> {
    // Kiểm tra status hiện tại trước khi update
    const currentProgress = await this.prismaService.userProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId
        }
      },
      select: { status: true }
    })

    // Không update status nếu đã là COMPLETED
    if (currentProgress && currentProgress.status === ProgressStatus.COMPLETED) {
      // Nếu đã COMPLETED, chỉ update các field khác (không update status)
      const updateData: any = { ...data }
      delete updateData.status // Không update status
      updateData.lastAccessedAt = new Date()

      const result = await this.prismaService.userProgress.update({
        where: {
          userId_lessonId: {
            userId,
            lessonId
          }
        },
        data: updateData
      })
      return this.transformUserProgress(result)
    }

    const updateData: any = { ...data }

    // Nếu status được cập nhật thành COMPLETED, set completedAt
    // So sánh với cả enum và string để tương thích
    if (data.status === ProgressStatus.COMPLETED || data.status === 'COMPLETED') {
      updateData.completedAt = new Date()
    }

    // Cập nhật lastAccessedAt
    updateData.lastAccessedAt = new Date()

    const result = await this.prismaService.userProgress.update({
      where: {
        userId_lessonId: {
          userId,
          lessonId
        }
      },
      data: updateData
    })
    return this.transformUserProgress(result)
  }

  async delete(where: { id: number }): Promise<UserProgressType> {
    const result = await this.prismaService.userProgress.delete({
      where
    })
    return this.transformUserProgress(result)
  }

  async count(where?: any): Promise<number> {
    return this.prismaService.userProgress.count({ where })
  }

  async upsert(
    userId: number,
    lessonId: number,
    data: {
      status?: string
      progressPercentage?: number
      testId?: number | null
    }
  ): Promise<UserProgressType> {
    // Lấy testId từ lesson nếu chưa có trong data
    let testId = data.testId
    if (testId === undefined) {
      const lesson = await this.prismaService.lesson.findUnique({
        where: { id: lessonId },
        select: { testId: true }
      })
      testId = lesson?.testId ?? null
    }

    const result = await this.prismaService.userProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId
        }
      },
      update: {
        status: (data.status || 'NOT_STARTED') as any,
        progressPercentage: data.progressPercentage || 0,
        lastAccessedAt: new Date(),
        // Chỉ update testId nếu có trong data (không tự động update từ lesson khi update)
        ...(data.testId !== undefined ? { testId: data.testId } : {})
      },
      create: {
        userId,
        lessonId,
        status: (data.status || 'NOT_STARTED') as any,
        progressPercentage: data.progressPercentage || 0,
        testId: testId
      }
    })
    return this.transformUserProgress(result)
  }

  /**
   * Lấy tất cả lesson có trong hệ thống
   */
  async getAllLessons(): Promise<{ id: number; testId: number | null }[]> {
    return await this.prismaService.lesson.findMany({
      select: {
        id: true,
        testId: true
      },
      orderBy: {
        id: 'asc'
      }
    })
  }

  /**
   * Lấy lesson liền trước theo thứ tự business (lessonOrder) trong cùng LessonCategory
   */
  async getPreviousLessonId(lessonId: number): Promise<number | null> {
    // Lấy thông tin lesson hiện tại
    const current = await this.prismaService.lesson.findUnique({
      where: { id: lessonId },
      select: { lessonCategoryId: true, lessonOrder: true }
    })

    if (!current) return null

    const prev = await this.prismaService.lesson.findFirst({
      where: {
        lessonCategoryId: current.lessonCategoryId,
        lessonOrder: { lt: current.lessonOrder },
        isPublished: true
      },
      orderBy: { lessonOrder: 'desc' },
      select: { id: true }
    })

    return prev?.id ?? null
  }

  /**
   * Lấy lesson liền sau theo thứ tự business (lessonOrder) trong cùng LessonCategory
   * Nếu không có lesson tiếp theo trong category hiện tại, tìm lesson đầu tiên của category tiếp theo (categoryId + 1)
   */
  async getNextLessonId(lessonId: number): Promise<number | null> {
    const current = await this.prismaService.lesson.findUnique({
      where: { id: lessonId },
      select: { lessonCategoryId: true, lessonOrder: true }
    })

    if (!current) return null

    // 1. Tìm lesson tiếp theo trong cùng category
    const next = await this.prismaService.lesson.findFirst({
      where: {
        lessonCategoryId: current.lessonCategoryId,
        lessonOrder: { gt: current.lessonOrder },
        isPublished: true
      },
      orderBy: { lessonOrder: 'asc' },
      select: { id: true }
    })

    if (next) {
      return next.id
    }

    // 2. Nếu không có lesson tiếp theo trong category hiện tại, tìm lesson đầu tiên của category tiếp theo
    const nextCategoryFirstLesson = await this.prismaService.lesson.findFirst({
      where: {
        lessonCategoryId: current.lessonCategoryId + 1, // Category tiếp theo (id tăng dần)
        isPublished: true
      },
      orderBy: { lessonOrder: 'asc' },
      select: { id: true }
    })

    return nextCategoryFirstLesson?.id ?? null
  }

  /**
   * Lấy danh sách lessonId theo level JLPT (1..5), đã publish, order theo lessonOrder asc
   */
  async getLessonIdsByLevelJlpt(levelJlpt: number): Promise<number[]> {
    const lessons = await this.prismaService.lesson.findMany({
      where: { levelJlpt: levelJlpt, isPublished: true },
      select: { id: true },
      orderBy: { lessonOrder: 'asc' }
    })
    return lessons.map((l) => l.id)
  }

  /**
   * Lấy bài đầu tiên (theo lessonOrder asc) của 1 level JLPT
   */
  async getFirstLessonIdByLevelJlpt(levelJlpt: number): Promise<number | null> {
    const first = await this.prismaService.lesson.findFirst({
      where: { levelJlpt: levelJlpt, isPublished: true },
      select: { id: true },
      orderBy: { lessonOrder: 'asc' }
    })
    return first?.id ?? null
  }

  /**
   * Lấy tất cả user có trong hệ thống
   */
  async getAllUsers(): Promise<{ id: number }[]> {
    return await this.prismaService.user.findMany({
      select: {
        id: true
      },
      orderBy: {
        id: 'asc'
      }
    })
  }

  /**
   * Tạo hàng loạt UserProgress
   */
  async bulkCreate(
    data: Array<{
      userId: number
      lessonId: number
      status: string
      progressPercentage: number
      testId?: number | null
    }>
  ): Promise<void> {
    await this.prismaService.userProgress.createMany({
      data: data.map((item) => ({
        userId: item.userId,
        lessonId: item.lessonId,
        status: item.status as any,
        progressPercentage: item.progressPercentage,
        testId: item.testId ?? null
      })),
      skipDuplicates: true // Bỏ qua nếu đã tồn tại
    })
  }

  private transformUserProgress(userProgress: any): any {
    return {
      id: userProgress.id,
      userId: userProgress.userId,
      lessonId: userProgress.lessonId,
      status: userProgress.status,
      progressPercentage: userProgress.progressPercentage,
      completedAt: userProgress.completedAt,
      lastAccessedAt: userProgress.lastAccessedAt,
      testId: userProgress.testId ?? null,
      createdAt: userProgress.createdAt,
      updatedAt: userProgress.updatedAt,
      lesson: userProgress.lesson
        ? {
            id: userProgress.lesson.id,
            titleJp: userProgress.lesson.titleJp,
            levelJlpt: userProgress.lesson.levelJlpt,
            isPublished: true
          }
        : undefined
    }
  }

  async findInProgressByUser(userId: number) {
    const result = await this.prismaService.userProgress.findFirst({
      where: {
        userId: userId,
        status: 'IN_PROGRESS'
      }
    })

    if (!result) {
      return null
    }

    return this.transformUserProgress(result)
  }

  async countCompletedByLevel(userId: number, levelJlpt: number) {
    const [totalLessons, completedLessons] = await Promise.all([
      this.prismaService.lesson.count({
        where: {
          levelJlpt,
          isPublished: true
        }
      }),
      this.prismaService.userProgress.count({
        where: {
          userId,
          status: ProgressStatus.COMPLETED,
          lesson: {
            levelJlpt
          }
        }
      })
    ])
    return { totalLessons, completedLessons }
  }

  async countAllCompleted(userId: number) {
    return this.prismaService.userProgress.count({
      where: {
        userId,
        status: ProgressStatus.COMPLETED
      }
    })
  }

  async listCompletedLessons(userId: number) {
    return this.prismaService.userProgress.findMany({
      where: {
        userId,
        status: ProgressStatus.COMPLETED
      },
      orderBy: [{ completedAt: 'asc' }, { updatedAt: 'asc' }],
      select: {
        lessonId: true,
        completedAt: true,
        updatedAt: true,
        lesson: {
          select: {
            levelJlpt: true
          }
        }
      }
    })
  }

  async getLessonProgress(userId: number, lessonId: number) {
    return this.prismaService.userProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId
        }
      },
      select: {
        id: true,
        status: true,
        progressPercentage: true,
        completedAt: true,
        updatedAt: true
      }
    })
  }
}
