import { UserTestAnswerLogType } from '@/modules/user-test-answer-log/entities/user-test-answer-log.entity'
import { PrismaService } from '@/shared/services/prisma.service'
import { toSkipTake } from '@/shared/utils/pagination'
import { Injectable } from '@nestjs/common'
import { Prisma, UserTestAnswerLog } from '@prisma/client'

const toLog = (log: UserTestAnswerLog): UserTestAnswerLogType => ({
  id: log.id,
  isCorrect: log.isCorrect,
  userTestAttemptId: log.userTestAttemptId,
  questionBankId: log.questionBankId,
  answerId: log.answerId,
  createdAt: log.createdAt,
  updatedAt: log.updatedAt
})

type LogInput = {
  userTestAttemptId: number
  questionBankId: number
  answerId: number
}

@Injectable()
export class UserTestAnswerLogRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: {
    currentPage: number
    pageSize: number
    userTestAttemptId?: number
    questionBankId?: number
    isCorrect?: boolean
  }) {
    const where: Prisma.UserTestAnswerLogWhereInput = {
      ...(params.userTestAttemptId && { userTestAttemptId: params.userTestAttemptId }),
      ...(params.questionBankId && { questionBankId: params.questionBankId }),
      ...(params.isCorrect !== undefined && { isCorrect: params.isCorrect })
    }
    const [items, total] = await Promise.all([
      this.prismaService.userTestAnswerLog.findMany({
        where,
        ...toSkipTake(params.currentPage, params.pageSize),
        orderBy: { createdAt: 'desc' }
      }),
      this.prismaService.userTestAnswerLog.count({ where })
    ])
    return { items: items.map(toLog), total }
  }

  async findUnique(id: number): Promise<UserTestAnswerLogType | null> {
    const log = await this.prismaService.userTestAnswerLog.findUnique({ where: { id } })
    return log ? toLog(log) : null
  }

  // The attempt's owner and the test sets of its test
  async findAttempt(id: number) {
    const attempt = await this.prismaService.userTestAttempt.findUnique({
      where: { id },
      select: {
        userId: true,
        test: { select: { testTestSets: { select: { testSetId: true } } } }
      }
    })
    if (!attempt) return null
    return {
      userId: attempt.userId,
      testSetIds: attempt.test.testTestSets.map((link) => link.testSetId)
    }
  }

  async isQuestionInTestSets(testSetIds: number[], questionBankId: number) {
    const link = await this.prismaService.testSetQuestionBank.findFirst({
      where: { testSetId: { in: testSetIds }, questionBankId },
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

  async create(data: LogInput, isCorrect: boolean): Promise<UserTestAnswerLogType> {
    return toLog(
      await this.prismaService.userTestAnswerLog.create({ data: { ...data, isCorrect } })
    )
  }

  // One log per question of an attempt: a new answer replaces the old one
  async upsert(data: LogInput, isCorrect: boolean): Promise<UserTestAnswerLogType> {
    const existing = await this.prismaService.userTestAnswerLog.findFirst({
      where: {
        userTestAttemptId: data.userTestAttemptId,
        questionBankId: data.questionBankId
      },
      select: { id: true }
    })
    const log = existing
      ? await this.prismaService.userTestAnswerLog.update({
          where: { id: existing.id },
          data: { answerId: data.answerId, isCorrect }
        })
      : await this.prismaService.userTestAnswerLog.create({
          data: { ...data, isCorrect }
        })
    return toLog(log)
  }

  async update(
    id: number,
    data: { isCorrect?: boolean }
  ): Promise<UserTestAnswerLogType> {
    return toLog(
      await this.prismaService.userTestAnswerLog.update({ where: { id }, data })
    )
  }

  async delete(id: number): Promise<UserTestAnswerLogType> {
    return toLog(await this.prismaService.userTestAnswerLog.delete({ where: { id } }))
  }

  // Used by user-test-attempt
  async findByUserTestAttemptId(userTestAttemptId: number) {
    const logs = await this.prismaService.userTestAnswerLog.findMany({
      where: { userTestAttemptId },
      orderBy: { createdAt: 'asc' }
    })
    return logs.map(toLog)
  }
}
