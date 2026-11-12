import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  CreateExercisesBodyType,
  UpdateExercisesBodyType,
  GetExercisesListQueryType
} from './entities/exercises.entity'

@Injectable()
export class ExercisesRepo {
  private readonly logger = new Logger(ExercisesRepo.name)

  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: GetExercisesListQueryType) {
    const {
      currentPage,
      pageSize,
      exerciseType,
      lessonId,
      isBlocked,
      search,
      sortBy,
      sort
    } = params
    const skip = (currentPage - 1) * pageSize

    const where: any = {}

    if (exerciseType) {
      where.exerciseType = exerciseType
    }

    if (lessonId) {
      where.lessonId = lessonId
    }

    if (isBlocked !== undefined) {
      where.isBlocked = Boolean(isBlocked)
    }

    if (search) {
      where.OR = [
        {
          testSet: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          testSet: {
            description: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      ]
    }

    const [items, total] = await Promise.all([
      this.prismaService.exercises.findMany({
        where,
        include: {
          lesson: {
            select: {
              id: true,
              titleKey: true,
              slug: true
            }
          },
          testSet: {
            select: {
              id: true,
              name: true,
              description: true,
              content: true,
              audioUrl: true,
              price: true,
              levelN: true,
              testType: true,
              status: true
            }
          }
        },
        orderBy: (() => {
          const primaryField = (sortBy ?? 'createdAt') as string
          const direction = (sort ?? 'desc') as 'asc' | 'desc'
          // Add secondary sort by id to ensure stable ordering when primary values are equal
          if (primaryField !== 'id') {
            return [{ [primaryField]: direction } as any, { id: direction } as any]
          }
          return [{ id: direction } as any]
        })(),
        skip,
        take: Number(pageSize)
      }),
      this.prismaService.exercises.count({ where })
    ])

    return {
      items,
      total,
      page: currentPage,
      limit: pageSize
    }
  }

  async findById(id: number) {
    return this.prismaService.exercises.findUnique({
      where: { id },
      include: {
        lesson: {
          select: {
            id: true,
            titleKey: true,
            slug: true
          }
        },
        testSet: {
          select: {
            id: true,
            name: true,
            description: true,
            content: true,
            audioUrl: true,
            price: true,
            levelN: true,
            testType: true,
            status: true,
            testSetQuestionBanks: {
              include: {
                questionBank: {
                  include: {
                    answers: true
                  }
                }
              },
              orderBy: {
                questionOrder: 'asc'
              }
            }
          }
        }
      }
    })
  }

  async findByIdHaveQuestionBank(id: number) {
    return this.prismaService.exercises.findUnique({
      where: { id },
      select: {
        id: true,
        exerciseType: true,
        isBlocked: true,
        testSetId: true,
        testSet: {
          select: {
            id: true,
            testSetQuestionBanks: {
              orderBy: { questionOrder: 'asc' },
              select: {
                id: true,
                questionOrder: true,
                questionBank: {
                  select: {
                    id: true,
                    questionJp: true,
                    questionKey: true,
                    answers: {
                      select: {
                        id: true,
                        answerJp: true,
                        answerKey: true,
                        isCorrect: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
  }

  async create(data: any) {
    return this.prismaService.exercises.create({
      data,
      include: {
        lesson: {
          select: {
            id: true,
            titleKey: true,
            slug: true
          }
        },
        testSet: {
          select: {
            id: true,
            name: true,
            description: true,
            content: true,
            audioUrl: true,
            price: true,
            levelN: true,
            testType: true,
            status: true
          }
        }
      }
    })
  }

  async update(id: number, data: any) {
    return this.prismaService.exercises.update({
      where: { id },
      data,
      include: {
        lesson: {
          select: {
            id: true,
            titleKey: true,
            slug: true
          }
        },
        testSet: {
          select: {
            id: true,
            name: true,
            description: true,
            content: true,
            audioUrl: true,
            price: true,
            levelN: true,
            testType: true,
            status: true
          }
        }
      }
    })
  }

  async updatePartial(id: number, data: any) {
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    )

    return this.prismaService.exercises.update({
      where: { id },
      data: cleanData,
      include: {
        lesson: {
          select: {
            id: true,
            titleKey: true,
            slug: true
          }
        },
        testSet: {
          select: {
            id: true,
            name: true,
            description: true,
            content: true,
            audioUrl: true,
            price: true,
            levelN: true,
            testType: true,
            status: true
          }
        }
      }
    })
  }

  async delete(id: number) {
    return this.prismaService.exercises.delete({
      where: { id }
    })
  }

  // Helper methods
  async checkExercisesExists(id: number) {
    const count = await this.prismaService.exercises.count({
      where: { id }
    })
    return count > 0
  }

  async checkLessonExists(lessonId: number) {
    const count = await this.prismaService.lesson.count({
      where: { id: lessonId }
    })
    return count > 0
  }

  async checkTestSetExists(testSetId: number) {
    const count = await this.prismaService.testSet.count({
      where: { id: testSetId }
    })
    return count > 0
  }

  async getLessonLevelJlpt(lessonId: number): Promise<number | null> {
    const lesson = await this.prismaService.lesson.findUnique({
      where: { id: lessonId },
      select: { levelJlpt: true }
    })
    return lesson?.levelJlpt || null
  }

  async getLessonRewardIds(lessonId: number): Promise<number[]> {
    const lesson = await this.prismaService.lesson.findUnique({
      where: { id: lessonId },
      select: { rewardId: true }
    })
    return lesson?.rewardId ?? []
  }

  async getTestSetLevelN(testSetId: number): Promise<number | null> {
    const testSet = await this.prismaService.testSet.findUnique({
      where: { id: testSetId },
      select: { levelN: true }
    })
    return testSet?.levelN || null
  }

  async findByLessonId(lessonId: number) {
    const result = await this.prismaService.exercises.findMany({
      where: { lessonId: lessonId },
      orderBy: { createdAt: 'asc' }
    })

    return result.map((item) => ({
      id: item.id,
      lessonId: item.lessonId,
      exerciseType: item.exerciseType,
      isBlocked: item.isBlocked,
      testSetId: item.testSetId,
      rewardId: item.rewardId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }))
  }

  async countByLesson(lessonId: number): Promise<number> {
    return this.prismaService.exercises.count({ where: { lessonId } })
  }

  async findByLessonAndType(lessonId: number, exerciseType: string) {
    return this.prismaService.exercises.findFirst({
      where: { lessonId, exerciseType }
    })
  }

  async existsByLessonAndTypeExcludingId(
    lessonId: number,
    exerciseType: string,
    excludeId: number
  ): Promise<boolean> {
    const count = await this.prismaService.exercises.count({
      where: {
        lessonId,
        exerciseType,
        NOT: { id: excludeId }
      }
    })
    return count > 0
  }

  async getTestSetType(testSetId: number): Promise<string | null> {
    const testSet = await this.prismaService.testSet.findUnique({
      where: { id: testSetId },
      select: { testType: true }
    })
    return testSet?.testType ?? null
  }

  async checkRewardsExist(rewardIds: number[]) {
    if (!rewardIds.length) {
      return true
    }
    const uniqueIds = Array.from(new Set(rewardIds))
    const count = await this.prismaService.reward.count({
      where: { id: { in: uniqueIds } }
    })
    return count === uniqueIds.length
  }

  async getRewardsByIds(rewardIds: number[]) {
    if (!rewardIds.length) {
      return []
    }
    const uniqueIds = Array.from(new Set(rewardIds))
    return this.prismaService.reward.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        nameKey: true,
        rewardType: true,
        rewardItem: true,
        rewardTarget: true
      }
    })
  }
}
