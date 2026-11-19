import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { ExerciseAttemptStatus, Prisma, TestAttemptStatus } from '@prisma/client'

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

  // ---- History screens (read only) ----

  findTestAttemptsOfUser(userId: number, status: string | undefined) {
    return this.prisma.userTestAttempt.findMany({
      where: {
        userId,
        ...(status ? { status: status as TestAttemptStatus } : {})
      },
      include: {
        test: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  findExerciseAttemptsOfUser(userId: number, status: string | undefined) {
    return this.prisma.userExerciseAttempt.findMany({
      where: {
        userId,
        ...(status ? { status: status as ExerciseAttemptStatus } : {})
      },
      include: {
        exercise: {
          include: {
            testSet: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  findTestAnswerLogs(attemptId: number) {
    return this.prisma.userTestAnswerLog.findMany({
      where: {
        userTestAttemptId: attemptId
      }
    })
  }

  findLanguageByCode(language: string) {
    return this.prisma.languages.findFirst({
      where: { code: language }
    })
  }

  // At most one translation (with its language)
  findFirstTranslation(translationWhere: Prisma.TranslationWhereInput) {
    return this.prisma.translation.findMany({
      where: translationWhere,
      include: { language: true },
      take: 1
    })
  }

  findExerciseAnswerLogs(attemptId: number) {
    return this.prisma.userAnswerLog.findMany({
      where: {
        userExerciseAttemptId: attemptId
      }
    })
  }

  // Every matching translation (with its language)
  findTranslations(translationWhere: Prisma.TranslationWhereInput) {
    return this.prisma.translation.findMany({
      where: translationWhere,
      include: {
        language: true
      }
    })
  }

  findTestAttemptsWithUser(testAttemptWhere: Prisma.UserTestAttemptWhereInput) {
    return this.prisma.userTestAttempt.findMany({
      where: testAttemptWhere,
      include: {
        test: true,
        user: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  findExerciseAttemptsWithUser(
    exerciseAttemptWhere: Prisma.UserExerciseAttemptWhereInput
  ) {
    return this.prisma.userExerciseAttempt.findMany({
      where: exerciseAttemptWhere,
      include: {
        exercise: {
          include: {
            testSet: true
          }
        },
        user: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }
}
