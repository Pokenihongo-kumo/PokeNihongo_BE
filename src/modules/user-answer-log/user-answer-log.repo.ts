import { UserAnswerLogType } from '@/modules/user-answer-log/entities/user-answer-log.entity'
import { PrismaService } from '@/shared/services/prisma.service'
import { toSkipTake } from '@/shared/utils/pagination'
import { Injectable } from '@nestjs/common'
import { Prisma, UserAnswerLog } from '@prisma/client'

const toLog = (log: UserAnswerLog): UserAnswerLogType => ({
  id: log.id,
  isCorrect: log.isCorrect,
  userExerciseAttemptId: log.userExerciseAttemptId,
  questionBankId: log.questionBankId,
  answerId: log.answerId,
  createdAt: log.createdAt,
  updatedAt: log.updatedAt
})

type LogInput = {
  userExerciseAttemptId: number
  questionBankId: number
  answerId: number
}

@Injectable()
export class UserAnswerLogRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: {
    currentPage: number
    pageSize: number
    userExerciseAttemptId?: number
    questionBankId?: number
    isCorrect?: boolean
  }) {
    const where: Prisma.UserAnswerLogWhereInput = {
      ...(params.userExerciseAttemptId && {
        userExerciseAttemptId: params.userExerciseAttemptId
      }),
      ...(params.questionBankId && { questionBankId: params.questionBankId }),
      ...(params.isCorrect !== undefined && { isCorrect: params.isCorrect })
    }
    const [items, total] = await Promise.all([
      this.prismaService.userAnswerLog.findMany({
        where,
        ...toSkipTake(params.currentPage, params.pageSize),
        orderBy: { createdAt: 'desc' }
      }),
      this.prismaService.userAnswerLog.count({ where })
    ])
    return { items: items.map(toLog), total }
  }

  async findUnique(id: number): Promise<UserAnswerLogType | null> {
    const log = await this.prismaService.userAnswerLog.findUnique({ where: { id } })
    return log ? toLog(log) : null
  }

  // The attempt's owner and the test set of its exercise
  findAttempt(id: number) {
    return this.prismaService.userExerciseAttempt.findUnique({
      where: { id },
      select: { userId: true, exercise: { select: { testSetId: true } } }
    })
  }

  async isQuestionInTestSet(testSetId: number, questionBankId: number) {
    const link = await this.prismaService.testSetQuestionBank.findFirst({
      where: { testSetId, questionBankId },
      select: { id: true }
    })
    return !!link
  }

  findAnswer(id: number) {
    return this.prismaService.answer.findUnique({
      where: { id },
      select: { isCorrect: true, questionBankId: true }
    })
  }

  async create(data: LogInput, isCorrect: boolean): Promise<UserAnswerLogType> {
    return toLog(
      await this.prismaService.userAnswerLog.create({ data: { ...data, isCorrect } })
    )
  }

  // One log per question of an attempt: a new answer replaces the old one
  async upsert(data: LogInput, isCorrect: boolean): Promise<UserAnswerLogType> {
    const existing = await this.prismaService.userAnswerLog.findFirst({
      where: {
        userExerciseAttemptId: data.userExerciseAttemptId,
        questionBankId: data.questionBankId
      },
      select: { id: true }
    })
    const log = existing
      ? await this.prismaService.userAnswerLog.update({
          where: { id: existing.id },
          data: { answerId: data.answerId, isCorrect }
        })
      : await this.prismaService.userAnswerLog.create({ data: { ...data, isCorrect } })
    return toLog(log)
  }

  async update(id: number, data: { isCorrect?: boolean }): Promise<UserAnswerLogType> {
    return toLog(await this.prismaService.userAnswerLog.update({ where: { id }, data }))
  }

  async delete(id: number): Promise<UserAnswerLogType> {
    return toLog(await this.prismaService.userAnswerLog.delete({ where: { id } }))
  }

  // Used by user-exercise-attempt
  async findByUserExerciseAttemptId(userExerciseAttemptId: number) {
    const logs = await this.prismaService.userAnswerLog.findMany({
      where: { userExerciseAttemptId },
      orderBy: { createdAt: 'asc' }
    })
    return logs.map(toLog)
  }
}
