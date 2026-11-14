import { UserTestAttemptType } from '@/modules/user-test-attempt/entities/user-test-attempt.entity'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class UserTestAttemptRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: {
    currentPage: number
    pageSize: number
    userId?: number
    testId?: number
    status?: string
  }) {
    const { currentPage, pageSize, userId, testId, status } = params
    const skip = (currentPage - 1) * pageSize

    const where: any = {}

    if (userId) {
      where.userId = userId
    }

    if (testId) {
      where.testId = testId
    }

    if (status) {
      where.status = status
    }

    const [items, total] = await Promise.all([
      this.prismaService.userTestAttempt.findMany({
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
          test: true,
          userTestAnswerLogs: true
        }
      }),
      this.prismaService.userTestAttempt.count({ where })
    ])

    return {
      items: items.map((item) => this.transformUserTestAttempt(item)),
      total,
      page: currentPage,
      limit: pageSize
    }
  }

  async findUnique(where: { id?: number }): Promise<UserTestAttemptType | null> {
    if (!where.id) return null

    const result = await this.prismaService.userTestAttempt.findUnique({
      where: { id: where.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        test: true,
        userTestAnswerLogs: true
      }
    })
    return result ? this.transformUserTestAttempt(result) : null
  }

  async create(data: { userId: number; testId: number }): Promise<UserTestAttemptType> {
    const result = await this.prismaService.userTestAttempt.create({
      data: {
        ...data,
        status: 'IN_PROGRESS'
      }
    })
    return this.transformUserTestAttempt(result)
  }

  async update(
    where: { id: number },
    data: {
      status?: string
      time?: number
      score?: number
    }
  ): Promise<UserTestAttemptType> {
    const result = await this.prismaService.userTestAttempt.update({
      where,
      data: {
        status: data.status as any,
        ...(data.time !== undefined ? { time: data.time } : {}),
        ...(data.score !== undefined ? { score: data.score } : {})
      }
    })
    return this.transformUserTestAttempt(result)
  }

  async delete(where: { id: number }): Promise<UserTestAttemptType> {
    const result = await this.prismaService.userTestAttempt.delete({
      where
    })
    return this.transformUserTestAttempt(result)
  }

  async count(where?: any): Promise<number> {
    return this.prismaService.userTestAttempt.count({ where })
  }

  private transformUserTestAttempt(userTestAttempt: any): UserTestAttemptType {
    return {
      id: userTestAttempt.id,
      userId: userTestAttempt.userId,
      testId: userTestAttempt.testId,
      status: userTestAttempt.status,
      time: userTestAttempt.time,
      score: userTestAttempt.score,
      createdAt: userTestAttempt.createdAt,
      updatedAt: userTestAttempt.updatedAt
    }
  }

  async findById(id: number): Promise<UserTestAttemptType | null> {
    const result = await this.prismaService.userTestAttempt.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        test: true,
        userTestAnswerLogs: true
      }
    })

    if (!result) {
      return null
    }

    return this.transformUserTestAttempt(result)
  }

  async findLatestByUserAndTest(
    userId: number,
    testId: number
  ): Promise<UserTestAttemptType | null> {
    const result = await this.prismaService.userTestAttempt.findFirst({
      where: { userId, testId },
      orderBy: { createdAt: 'desc' }
    })
    return result ? this.transformUserTestAttempt(result) : null
  }

  /**
   * Tìm attempt gần nhất theo thứ tự ưu tiên:
   * Ưu tiên theo thời gian: attempt có updatedAt gần nhất là ưu tiên cao nhất
   * Trong cùng khoảng thời gian (cùng updatedAt), ưu tiên theo status: IN_PROGRESS > ABANDONED > SKIPPED > COMPLETED/FAILED
   */
  async findLatestByPriority(
    userId: number,
    testId: number
  ): Promise<UserTestAttemptType | null> {
    // Lấy tất cả attempts và sắp xếp theo updatedAt desc
    const allAttempts = await this.prismaService.userTestAttempt.findMany({
      where: { userId, testId },
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
      return this.transformUserTestAttempt(latestAttempts[0])
    }

    // Nếu có nhiều attempts cùng updatedAt, chọn theo priority order
    for (const status of priorityOrder) {
      const found = latestAttempts.find((attempt) => attempt.status === status)
      if (found) {
        return this.transformUserTestAttempt(found)
      }
    }

    // Fallback: trả về attempt đầu tiên trong latestAttempts
    return this.transformUserTestAttempt(latestAttempts[0])
  }

  async hasCompletedAttempt(userId: number, testId: number): Promise<boolean> {
    const completedAttempt = await this.prismaService.userTestAttempt.findFirst({
      where: {
        userId,
        testId,
        status: 'COMPLETED'
      }
    })
    return !!completedAttempt
  }

  async findTestSetQuestionBanksByTestSetIds(testSetIds: number[]) {
    return this.prismaService.testSetQuestionBank.findMany({
      where: {
        testSetId: { in: testSetIds }
      },
      include: {
        questionBank: {
          select: {
            id: true,
            levelN: true,
            questionType: true
          }
        }
      }
    })
  }

  async findTestTestSetsByTestId(testId: number) {
    return this.prismaService.testTestSet.findMany({
      where: { testId },
      select: { testSetId: true }
    })
  }
}
