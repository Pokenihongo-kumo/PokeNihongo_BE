import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { ExerciseAttemptStatus, TestAttemptStatus } from '@prisma/client'

@Injectable()
export class UserHistoryRepo {
  constructor(private readonly prisma: PrismaService) {}

  async findRecentExerciseAttempts(params: {
    userId: number
    status?: ExerciseAttemptStatus
  }) {
    const { userId, status } = params

    const exerciseWhere: any = { userId }
    if (status) {
      exerciseWhere.status = status
    }

    return this.prisma.userExerciseAttempt.findMany({
      where: exerciseWhere,
      include: {
        exercise: {
          include: {
            testSet: true,
            lesson: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })
  }

  async findRecentTestAttempts(params: { userId: number; status?: TestAttemptStatus }) {
    const { userId, status } = params

    const testWhere: any = { userId }
    if (status) {
      testWhere.status = status
    }

    return this.prisma.userTestAttempt.findMany({
      where: testWhere,
      include: {
        test: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })
  }
}
