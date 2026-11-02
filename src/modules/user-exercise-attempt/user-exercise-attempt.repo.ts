import {
  LatestExerciseAttemptType,
  UserExerciseAttemptType
} from '@/modules/user-exercise-attempt/entities/user-exercise-attempt.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { LessonContentsType } from '@prisma/client'

@Injectable()
export class UserExerciseAttemptRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: {
    currentPage: number
    pageSize: number
    userId?: number
    exerciseId?: number
    status?: string
  }) {
    const { currentPage, pageSize, userId, exerciseId, status } = params
    const skip = (currentPage - 1) * pageSize

    const where: any = {}

    if (userId) {
      where.userId = userId
    }

    if (exerciseId) {
      where.exerciseId = exerciseId
    }

    if (status) {
      where.status = status
    }

    const [items, total] = await Promise.all([
      this.prismaService.userExerciseAttempt.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          exercise: true,
          userAnswerLogs: true
        }
      }),
      this.prismaService.userExerciseAttempt.count({ where })
    ])

    return {
      items: items.map((item) => this.transformUserExerciseAttempt(item)),
      total,
      page: currentPage,
      limit: pageSize
    }
  }

  async findUnique(where: { id?: number }): Promise<UserExerciseAttemptType | null> {
    if (!where.id) return null

    const result = await this.prismaService.userExerciseAttempt.findUnique({
      where: { id: where.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        exercise: true,
        userAnswerLogs: true
      }
    })
    return result ? this.transformUserExerciseAttempt(result) : null
  }

  async create(data: {
    userId: number
    exerciseId: number
  }): Promise<UserExerciseAttemptType> {
    const result = await this.prismaService.userExerciseAttempt.create({
      data: {
        ...data,
        status: 'IN_PROGRESS'
      }
    })
    return this.transformUserExerciseAttempt(result)
  }

  async update(
    where: { id: number },
    data: {
      status?: string
      time?: number
    }
  ): Promise<UserExerciseAttemptType> {
    const result = await this.prismaService.userExerciseAttempt.update({
      where,
      data: {
        status: data.status as any,
        ...(data.time !== undefined ? { time: data.time } : {})
      }
    })
    return this.transformUserExerciseAttempt(result)
  }

  async delete(where: { id: number }): Promise<UserExerciseAttemptType> {
    const result = await this.prismaService.userExerciseAttempt.delete({
      where
    })
    return this.transformUserExerciseAttempt(result)
  }

  async count(where?: any): Promise<number> {
    return this.prismaService.userExerciseAttempt.count({ where })
  }

  private transformUserExerciseAttempt(
    userExerciseAttempt: any
  ): UserExerciseAttemptType {
    return {
      id: userExerciseAttempt.id,
      userId: userExerciseAttempt.userId,
      exerciseId: userExerciseAttempt.exerciseId,
      status: userExerciseAttempt.status,
      time: userExerciseAttempt.time,
      createdAt: userExerciseAttempt.createdAt,
      updatedAt: userExerciseAttempt.updatedAt
    }
  }

  async findById(id: number): Promise<UserExerciseAttemptType | null> {
    const result = await this.prismaService.userExerciseAttempt.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        exercise: true,
        userAnswerLogs: true
      }
    })

    if (!result) {
      return null
    }

    return this.transformUserExerciseAttempt(result)
  }

  async findLatestByUserAndExercise(
    userId: number,
    exerciseId: number
  ): Promise<UserExerciseAttemptType | null> {
    const result = await this.prismaService.userExerciseAttempt.findFirst({
      where: { userId, exerciseId },
      orderBy: { createdAt: 'desc' }
    })
    return result ? this.transformUserExerciseAttempt(result) : null
  }

  /**
   * Tìm attempt gần nhất theo thứ tự ưu tiên:
   * Ưu tiên theo thời gian: attempt có updatedAt gần nhất là ưu tiên cao nhất
   * Trong cùng khoảng thời gian (cùng updatedAt), ưu tiên theo status: IN_PROGRESS > ABANDONED > SKIPPED > COMPLETED/FAILED
   *
   * Logic:
   * - Nếu SKIPPED gần nhất (updatedAt gần nhất) → sẽ được chọn, sau đó service sẽ tạo mới
   * - Nếu ABANDONED gần nhất → lấy ABANDONED
   * - Nếu IN_PROGRESS gần nhất → lấy IN_PROGRESS
   */
  async findLatestByPriority(
    userId: number,
    exerciseId: number
  ): Promise<UserExerciseAttemptType | null> {
    // Lấy tất cả attempts và sắp xếp theo updatedAt desc
    const allAttempts = await this.prismaService.userExerciseAttempt.findMany({
      where: { userId, exerciseId },
      orderBy: { updatedAt: 'desc' }
    })

    if (allAttempts.length === 0) {
      return null
    }

    // Ưu tiên: attempt gần nhất (updatedAt gần nhất) là quan trọng nhất
    // Nhưng nếu có nhiều attempts cùng updatedAt, ưu tiên theo status
    const priorityOrder = [
      'IN_PROGRESS',
      'ABANDONED',
      'SKIPPED',
      'NOT_STARTED',
      'COMPLETED',
      'FAILED'
    ]

    // Lấy attempt gần nhất (updatedAt gần nhất)
    const latestUpdatedAt = allAttempts[0].updatedAt

    // Tìm tất cả attempts có cùng updatedAt gần nhất
    const latestAttempts = allAttempts.filter(
      (attempt) => attempt.updatedAt.getTime() === latestUpdatedAt.getTime()
    )

    // Nếu chỉ có 1 attempt với updatedAt gần nhất, trả về luôn
    if (latestAttempts.length === 1) {
      return this.transformUserExerciseAttempt(latestAttempts[0])
    }

    // Nếu có nhiều attempts cùng updatedAt, chọn theo priority order
    for (const status of priorityOrder) {
      const found = latestAttempts.find((attempt) => attempt.status === status)
      if (found) {
        return this.transformUserExerciseAttempt(found)
      }
    }

    // Fallback: trả về attempt đầu tiên trong latestAttempts
    return this.transformUserExerciseAttempt(latestAttempts[0])
  }

  async findCompletedExercisesByLesson(userId: number, lessonId: number) {
    // Lấy tất cả exercises của lesson
    const lessonExercises = await this.prismaService.exercises.findMany({
      where: { lessonId: lessonId },
      select: { id: true }
    })

    const exerciseIds = lessonExercises.map((ex) => ex.id)

    // Lấy tất cả attempts COMPLETED của user trong lesson này
    const completedAttempts = await this.prismaService.userExerciseAttempt.findMany({
      where: {
        userId: userId,
        exerciseId: { in: exerciseIds },
        status: 'COMPLETED'
      },
      select: { exerciseId: true }
    })

    // Sử dụng Set để chỉ lấy các exerciseId riêng biệt (không trùng lặp)
    // Ngay cả khi user làm cùng 1 exercise nhiều lần và đều COMPLETED, chỉ đếm 1 lần
    const uniqueExerciseIds = Array.from(
      new Set(completedAttempts.map((attempt) => attempt.exerciseId))
    )

    return uniqueExerciseIds
  }

  async hasCompletedAttempt(userId: number, exerciseId: number): Promise<boolean> {
    const completedAttempt = await this.prismaService.userExerciseAttempt.findFirst({
      where: {
        userId,
        exerciseId,
        status: 'COMPLETED'
      }
    })
    return !!completedAttempt
  }

  async findLatestByLessonAndUser(
    userId: number,
    lessonId: number
  ): Promise<LatestExerciseAttemptType[]> {
    // Lấy tất cả exercise trong lesson
    const exercises = await this.prismaService.exercises.findMany({
      where: { lessonId },
      select: { id: true, exerciseType: true }
    })

    if (exercises.length === 0) {
      return []
    }

    const exerciseIds = exercises.map((ex) => ex.id)

    // Với mỗi exercise, lấy attempt ưu tiên của user
    const latestAttempts = await Promise.all(
      exerciseIds.map(async (exerciseId) => {
        // 1. Tìm COMPLETED attempt gần nhất (ưu tiên cao nhất)
        let priorityAttempt = await this.prismaService.userExerciseAttempt.findFirst({
          where: {
            userId,
            exerciseId,
            status: 'COMPLETED'
          },
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            exercise: {
              select: {
                exerciseType: true
              }
            }
          }
        })

        // 2. Nếu không có COMPLETED, tìm attempt gần nhất
        if (!priorityAttempt) {
          priorityAttempt = await this.prismaService.userExerciseAttempt.findFirst({
            where: {
              userId,
              exerciseId
            },
            orderBy: {
              createdAt: 'desc'
            },
            include: {
              exercise: {
                select: {
                  exerciseType: true
                }
              }
            }
          })
        }

        // 3. Nếu vẫn không có attempt nào, tạo attempt mới với status NOT_STARTED
        if (!priorityAttempt) {
          const newAttempt = await this.prismaService.userExerciseAttempt.create({
            data: {
              userId,
              exerciseId,
              status: 'NOT_STARTED'
            },
            include: {
              exercise: {
                select: {
                  exerciseType: true
                }
              }
            }
          })

          const obj: LatestExerciseAttemptType = {
            id: newAttempt.id,
            userId: newAttempt.userId,
            exerciseId: newAttempt.exerciseId,
            exerciseType: newAttempt.exercise.exerciseType as LessonContentsType,
            status: newAttempt.status,
            createdAt: newAttempt.createdAt,
            updatedAt: newAttempt.updatedAt
          }
          return obj
        }

        // 4. Trả về attempt đã tìm thấy
        const obj: LatestExerciseAttemptType = {
          id: priorityAttempt.id,
          userId: priorityAttempt.userId,
          exerciseId: priorityAttempt.exerciseId,
          exerciseType: priorityAttempt.exercise.exerciseType as LessonContentsType,
          status: priorityAttempt.status,
          createdAt: priorityAttempt.createdAt,
          updatedAt: priorityAttempt.updatedAt
        }
        return obj
      })
    )

    // Lọc bỏ null values (không cần thiết nữa vì luôn tạo attempt mới)
    return latestAttempts.filter(
      (attempt): attempt is LatestExerciseAttemptType => attempt !== null
    )
  }
}
