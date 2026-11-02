import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  UserSpeakingAttemptType,
  CreateUserSpeakingAttemptType,
  UpdateUserSpeakingAttemptType,
  GetUserSpeakingAttemptListQueryType
} from './entities/speaking.entities'

@Injectable()
export class SpeakingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    _data: CreateUserSpeakingAttemptType & { userId: number }
  ): Promise<UserSpeakingAttemptType> {
    throw new Error('UserSpeakingAttempt model has been removed')
  }

  async findById(_id: number): Promise<UserSpeakingAttemptType | null> {
    return null
  }

  async findMany(
    query: GetUserSpeakingAttemptListQueryType
  ): Promise<{ data: UserSpeakingAttemptType[]; total: number }> {
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

    const data: UserSpeakingAttemptType[] = []
    const total = 0

    return { data, total }
  }

  async update(
    _id: number,
    _data: UpdateUserSpeakingAttemptType
  ): Promise<UserSpeakingAttemptType> {
    throw new Error('UserSpeakingAttempt model has been removed')
  }

  async delete(_id: number): Promise<UserSpeakingAttemptType> {
    throw new Error('UserSpeakingAttempt model has been removed')
  }

  async findByUserId(_userId: number): Promise<UserSpeakingAttemptType[]> {
    return []
  }

  async findByQuestionBankId(
    _questionBankId: number
  ): Promise<UserSpeakingAttemptType[]> {
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
