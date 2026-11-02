import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  CreateUserRewardHistoryBodyType,
  GetUserRewardHistoryListQueryType,
  UpdateUserRewardHistoryBodyType,
  UserRewardHistoryType
} from '@/modules/user-reward-history/entities/user-reward-history.entities'
import { Prisma, RewardTarget } from '@prisma/client'

@Injectable()
export class UserRewardHistoryRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private get delegate() {
    return (this.prismaService as any).userRewardHistory as any
  }

  private transform(record: any): UserRewardHistoryType {
    return {
      id: record.id,
      userId: record.userId,
      rewardId: record.rewardId ?? null,
      rewardTargetSnapshot: (record.rewardTargetSnapshot as RewardTarget | null) ?? null,
      amount: record.amount ?? null,
      sourceType: record.sourceType,
      sourceId: record.sourceId ?? null,
      note: record.note ?? null,
      meta: record.meta ? JSON.parse(JSON.stringify(record.meta)) : null,
      createdAt: record.createdAt,
      reward: record.reward
        ? {
            id: record.reward.id,
            rewardType: record.reward.rewardType,
            rewardItem: record.reward.rewardItem,
            rewardTarget: record.reward.rewardTarget
          }
        : undefined
    }
  }

  async findMany(params: GetUserRewardHistoryListQueryType) {
    const {
      currentPage,
      pageSize,
      userId,
      rewardId,
      sourceType,
      rewardTargetSnapshot,
      dateFrom,
      dateTo
    } = params
    const skip = (currentPage - 1) * pageSize

    const where: Record<string, any> = {}

    if (userId) {
      where.userId = userId
    }

    if (rewardId) {
      where.rewardId = rewardId
    }

    if (sourceType) {
      where.sourceType = sourceType
    }

    if (rewardTargetSnapshot) {
      where.rewardTargetSnapshot = rewardTargetSnapshot as RewardTarget
    }

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {})
      }
    }

    const [items, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          reward: true
        }
      }),
      this.delegate.count({ where })
    ])

    return {
      items: items.map((item: any) => this.transform(item)),
      total,
      page: currentPage,
      limit: pageSize
    }
  }

  async findUnique(id: number): Promise<UserRewardHistoryType | null> {
    const record = await this.delegate.findUnique({
      where: { id },
      include: {
        reward: true
      }
    })
    return record ? this.transform(record) : null
  }

  async create(data: CreateUserRewardHistoryBodyType): Promise<UserRewardHistoryType> {
    const result = await this.delegate.create({
      data: {
        userId: data.userId,
        rewardId: data.rewardId ?? null,
        rewardTargetSnapshot: data.rewardTargetSnapshot ?? null,
        amount: data.amount ?? null,
        sourceType: data.sourceType,
        sourceId: data.sourceId ?? null,
        note: data.note ?? null,
        meta: (data.meta as Prisma.InputJsonValue | undefined) ?? undefined
      },
      include: {
        reward: true
      }
    })

    return this.transform(result)
  }

  async update(
    id: number,
    data: UpdateUserRewardHistoryBodyType
  ): Promise<UserRewardHistoryType> {
    const updateData: Record<string, any> = {}

    if ('rewardId' in data) {
      updateData.rewardId = data.rewardId ?? null
    }

    if ('rewardTargetSnapshot' in data) {
      updateData.rewardTargetSnapshot = data.rewardTargetSnapshot
        ? data.rewardTargetSnapshot
        : null
    }

    if ('amount' in data) {
      updateData.amount = data.amount ?? null
    }

    if ('sourceType' in data && data.sourceType !== undefined) {
      updateData.sourceType = data.sourceType
    }

    if ('sourceId' in data) {
      updateData.sourceId = data.sourceId ?? null
    }

    if ('note' in data) {
      updateData.note = data.note ?? null
    }

    if ('meta' in data) {
      updateData.meta = (data.meta as Prisma.InputJsonValue) ?? null
    }

    const result = await this.delegate.update({
      where: { id },
      data: updateData,
      include: {
        reward: true
      }
    })

    return this.transform(result)
  }

  async delete(id: number): Promise<UserRewardHistoryType> {
    const result = await this.delegate.delete({
      where: { id },
      include: {
        reward: true
      }
    })

    return this.transform(result)
  }
}
