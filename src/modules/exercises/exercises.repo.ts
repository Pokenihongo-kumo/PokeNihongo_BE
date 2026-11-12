import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { GetExercisesListQueryType } from './entities/exercises.entity'
import { toSkipTake } from '@/shared/utils/pagination'
import { Prisma } from '@prisma/client'

// Lesson and test set summary returned with an exercise
const withLessonAndTestSet = {
  lesson: { select: { id: true, titleKey: true, slug: true } },
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
} satisfies Prisma.ExercisesInclude

@Injectable()
export class ExercisesRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: GetExercisesListQueryType) {
    const { currentPage, pageSize, exerciseType, lessonId, isBlocked, search } = params
    const where: Prisma.ExercisesWhereInput = {
      ...(exerciseType && { exerciseType }),
      ...(lessonId && { lessonId }),
      ...(isBlocked !== undefined && { isBlocked }),
      ...(search && {
        OR: [
          { testSet: { name: { contains: search, mode: 'insensitive' } } },
          { testSet: { description: { contains: search, mode: 'insensitive' } } }
        ]
      })
    }
    // Secondary sort by id keeps pages stable when the primary values are equal
    const orderBy: Prisma.ExercisesOrderByWithRelationInput[] =
      params.sortBy === 'id'
        ? [{ id: params.sort }]
        : [{ [params.sortBy]: params.sort }, { id: params.sort }]

    const [items, total] = await Promise.all([
      this.prismaService.exercises.findMany({
        where,
        include: withLessonAndTestSet,
        orderBy,
        ...toSkipTake(currentPage, pageSize)
      }),
      this.prismaService.exercises.count({ where })
    ])
    return { items, total }
  }

  // With the test set's questions and their answers
  findById(id: number) {
    return this.prismaService.exercises.findUnique({
      where: { id },
      include: {
        lesson: withLessonAndTestSet.lesson,
        testSet: {
          select: {
            ...withLessonAndTestSet.testSet.select,
            testSetQuestionBanks: {
              include: { questionBank: { include: { answers: true } } },
              orderBy: { questionOrder: 'asc' }
            }
          }
        }
      }
    })
  }

  // Used by user-exercise-attempt: questions and answers only
  findByIdHaveQuestionBank(id: number) {
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

  create(data: Prisma.ExercisesUncheckedCreateInput) {
    return this.prismaService.exercises.create({ data, include: withLessonAndTestSet })
  }

  update(id: number, data: Prisma.ExercisesUncheckedUpdateInput) {
    return this.prismaService.exercises.update({
      where: { id },
      data,
      include: withLessonAndTestSet
    })
  }

  delete(id: number) {
    return this.prismaService.exercises.delete({ where: { id } })
  }

  // What the create/update rules need about the target lesson and test set;
  // `exceptId` leaves the exercise being updated out of the lesson's exercises
  async ruleContext(
    lessonId: number,
    testSetId: number | null | undefined,
    exceptId?: number
  ) {
    const [lesson, testSet, exercises] = await Promise.all([
      this.prismaService.lesson.findUnique({
        where: { id: lessonId },
        select: { levelJlpt: true }
      }),
      testSetId
        ? this.prismaService.testSet.findUnique({
            where: { id: testSetId },
            select: { levelN: true, testType: true }
          })
        : null,
      this.prismaService.exercises.findMany({
        where: { lessonId, ...(exceptId && { NOT: { id: exceptId } }) },
        select: { exerciseType: true }
      })
    ])
    return { lesson, testSet, otherTypes: exercises.map((e) => e.exerciseType) }
  }

  // Used by user-exercise-attempt; 0 counts as no level
  async getLessonLevelJlpt(lessonId: number): Promise<number | null> {
    const lesson = await this.prismaService.lesson.findUnique({
      where: { id: lessonId },
      select: { levelJlpt: true }
    })
    return lesson?.levelJlpt || null
  }

  // null when the lesson does not exist
  async getLessonRewardIds(lessonId: number): Promise<number[] | null> {
    const lesson = await this.prismaService.lesson.findUnique({
      where: { id: lessonId },
      select: { rewardId: true }
    })
    return lesson ? lesson.rewardId : null
  }

  findByLessonId(lessonId: number) {
    return this.prismaService.exercises.findMany({
      where: { lessonId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        lessonId: true,
        exerciseType: true,
        isBlocked: true,
        testSetId: true,
        rewardId: true,
        createdAt: true,
        updatedAt: true
      }
    })
  }

  async countRewards(rewardIds: number[]): Promise<number> {
    return this.prismaService.reward.count({ where: { id: { in: rewardIds } } })
  }

  getRewardsByIds(rewardIds: number[]) {
    return this.prismaService.reward.findMany({
      where: { id: { in: [...new Set(rewardIds)] } },
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
