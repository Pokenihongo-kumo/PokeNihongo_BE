import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import {
  CreateUserSpeakingAttempt,
  GetUserSpeakingAttemptListQuery,
  UpdateUserSpeakingAttempt
} from './dto/speaking.zod-dto'
import { UserSpeakingAttempt } from './entities/speaking.entity'

@Injectable()
export class SpeakingRepo {
  constructor(private readonly prisma: PrismaService) {}

  // The question the attempt answers (existence check before upload)
  findQuestionBank(id: number) {
    return this.prisma.questionBank.findUnique({ where: { id } })
  }

  async create(
    _data: CreateUserSpeakingAttempt & { userId: number }
  ): Promise<UserSpeakingAttempt> {
    throw new Error('UserSpeakingAttempt model has been removed')
  }

  async findById(_id: number): Promise<UserSpeakingAttempt | null> {
    return null
  }

  async findMany(
    query: GetUserSpeakingAttemptListQuery
  ): Promise<{ data: UserSpeakingAttempt[]; total: number }> {
    const { currentPage, pageSize, userId, questionBankId, minScore, maxScore, search } =
      query
    const skip = (currentPage - 1) * pageSize

    const where: any = {}

    if (userId) {
      where.userId = userId
    }

    if (questionBankId) {
      where.questionBankId = questionBankId
    }

    if (minScore !== undefined || maxScore !== undefined) {
      where.overallScore = {}
      if (minScore !== undefined) {
        where.overallScore.gte = minScore
      }
      if (maxScore !== undefined) {
        where.overallScore.lte = maxScore
      }
    }

    if (search) {
      where.OR = [
        { userTranscription: { contains: search, mode: 'insensitive' } },
        { questionBank: { questionJp: { contains: search, mode: 'insensitive' } } }
      ]
    }

    const data: UserSpeakingAttempt[] = []
    const total = 0

    return { data, total }
  }

  async update(
    _id: number,
    _data: UpdateUserSpeakingAttempt
  ): Promise<UserSpeakingAttempt> {
    throw new Error('UserSpeakingAttempt model has been removed')
  }

  async delete(_id: number): Promise<UserSpeakingAttempt> {
    throw new Error('UserSpeakingAttempt model has been removed')
  }

  async findByUserId(_userId: number): Promise<UserSpeakingAttempt[]> {
    return []
  }

  async findByQuestionBankId(_questionBankId: number): Promise<UserSpeakingAttempt[]> {
    return []
  }

  async getStatistics(userId?: number): Promise<any> {
    const where = userId ? { userId } : {}

    return {
      totalAttempts: 0,
      averageScore: 0,
      bestScore: 0,
      attemptsByLevel: {},
      attemptsByType: {},
      recentAttempts: []
    }
  }
}
