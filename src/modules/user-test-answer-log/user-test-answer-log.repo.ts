import { UserTestAnswerLogType } from '@/modules/user-test-answer-log/entities/user-test-answer-log.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class UserTestAnswerLogRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: {
    currentPage: number
    pageSize: number
    userTestAttemptId?: number
    questionBankId?: number
    isCorrect?: boolean
  }) {
    const { currentPage, pageSize, userTestAttemptId, questionBankId, isCorrect } = params
    const skip = (currentPage - 1) * pageSize

    const where: any = {}

    if (userTestAttemptId) {
      where.userTestAttemptId = userTestAttemptId
    }

    if (questionBankId) {
      where.questionBankId = questionBankId
    }

    if (isCorrect !== undefined) {
      where.isCorrect = isCorrect
    }

    const [items, total] = await Promise.all([
      this.prismaService.userTestAnswerLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          userTestAttempt: true,
          questionBank: true,
          answer: true
        }
      }),
      this.prismaService.userTestAnswerLog.count({ where })
    ])

    return {
      items: items.map((item) => this.transformUserTestAnswerLog(item)),
      total,
      page: currentPage,
      limit: pageSize
    }
  }

  async findUnique(where: { id?: number }): Promise<UserTestAnswerLogType | null> {
    if (!where.id) return null

    const result = await this.prismaService.userTestAnswerLog.findUnique({
      where: { id: where.id },
      include: {
        userTestAttempt: true,
        questionBank: true,
        answer: true
      }
    })
    return result ? this.transformUserTestAnswerLog(result) : null
  }

  async create(data: {
    userTestAttemptId: number
    questionBankId: number
    answerId: number
  }): Promise<UserTestAnswerLogType> {
    // Lấy thông tin answer để kiểm tra isCorrect và ràng buộc cùng câu hỏi
    const answer = await this.prismaService.answer.findUnique({
      where: { id: data.answerId },
      select: { id: true, isCorrect: true, questionBankId: true }
    })

    if (!answer) {
      throw new Error('Answer not found')
    }

    // Không cho phép chọn đáp án không thuộc câu hỏi
    if (answer.questionBankId !== data.questionBankId) {
      throw new Error('Đáp án không thuộc về câu hỏi đã chọn')
    }

    const result = await this.prismaService.userTestAnswerLog.create({
      data: {
        ...data,
        isCorrect: answer.isCorrect
      }
    })
    return this.transformUserTestAnswerLog(result)
  }

  async upsert(
    data: {
      userTestAttemptId: number
      questionBankId: number
      answerId: number
    },
    userId: number
  ): Promise<UserTestAnswerLogType> {
    // Validate question belongs to the testSets of this attempt
    const attempt = await this.prismaService.userTestAttempt.findUnique({
      where: { id: data.userTestAttemptId },
      select: {
        id: true,
        userId: true,
        test: {
          select: {
            id: true,
            testTestSets: {
              select: {
                testSet: {
                  select: {
                    id: true
                  }
                }
              }
            }
          }
        }
      }
    })
    if (!attempt) {
      throw new Error('Lần thử bài test không tồn tại')
    }
    if (attempt.userId !== userId) {
      throw new Error('Attempt không thuộc về người dùng')
    }
    if (!attempt.test?.testTestSets || attempt.test.testTestSets.length === 0) {
      throw new Error('Bài test không có bộ đề (test set)')
    }

    // Kiểm tra questionBank có thuộc về một trong các testSet của test này không
    const testSetIds = attempt.test.testTestSets.map((tts: any) => tts.testSet.id)
    const link = await this.prismaService.testSetQuestionBank.findFirst({
      where: {
        testSetId: { in: testSetIds },
        questionBankId: data.questionBankId
      }
    })
    if (!link) {
      throw new Error('Câu hỏi không thuộc về bài test hiện tại')
    }

    // Lấy thông tin answer để kiểm tra isCorrect và ràng buộc cùng câu hỏi
    const answer = await this.prismaService.answer.findUnique({
      where: { id: data.answerId },
      select: { id: true, isCorrect: true, questionBankId: true }
    })

    if (!answer) {
      throw new Error('Answer not found')
    }

    // Không cho phép chọn đáp án không thuộc câu hỏi
    if (answer.questionBankId !== data.questionBankId) {
      throw new Error('Đáp án không thuộc về câu hỏi đã chọn')
    }

    // Tìm xem đã có UserTestAnswerLog cho userTestAttemptId + questionBankId chưa
    const existingLog = await this.prismaService.userTestAnswerLog.findFirst({
      where: {
        userTestAttemptId: data.userTestAttemptId,
        questionBankId: data.questionBankId
      }
    })

    if (existingLog) {
      // Nếu đã có thì update
      const result = await this.prismaService.userTestAnswerLog.update({
        where: { id: existingLog.id },
        data: {
          answerId: data.answerId,
          isCorrect: answer.isCorrect
        }
      })
      return this.transformUserTestAnswerLog(result)
    } else {
      // Nếu chưa có thì create
      const result = await this.prismaService.userTestAnswerLog.create({
        data: {
          ...data,
          isCorrect: answer.isCorrect
        }
      })
      return this.transformUserTestAnswerLog(result)
    }
  }

  async update(
    where: { id: number },
    data: {
      isCorrect?: boolean
    }
  ): Promise<UserTestAnswerLogType> {
    const result = await this.prismaService.userTestAnswerLog.update({
      where,
      data
    })
    return this.transformUserTestAnswerLog(result)
  }

  async delete(where: { id: number }): Promise<UserTestAnswerLogType> {
    const result = await this.prismaService.userTestAnswerLog.delete({
      where
    })
    return this.transformUserTestAnswerLog(result)
  }

  async count(where?: any): Promise<number> {
    return this.prismaService.userTestAnswerLog.count({ where })
  }

  private transformUserTestAnswerLog(userTestAnswerLog: any): UserTestAnswerLogType {
    return {
      id: userTestAnswerLog.id,
      isCorrect: userTestAnswerLog.isCorrect,
      userTestAttemptId: userTestAnswerLog.userTestAttemptId,
      questionBankId: userTestAnswerLog.questionBankId,
      answerId: userTestAnswerLog.answerId,
      createdAt: userTestAnswerLog.createdAt,
      updatedAt: userTestAnswerLog.updatedAt
    }
  }

  async findByUserTestAttemptId(
    userTestAttemptId: number
  ): Promise<UserTestAnswerLogType[]> {
    const result = await this.prismaService.userTestAnswerLog.findMany({
      where: {
        userTestAttemptId: userTestAttemptId
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return result.map((item) => this.transformUserTestAnswerLog(item))
  }
}
