import { RewardClaimStatus } from '@/common/constants/reward.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateUserSeasonHistoryBody,
  UpdateUserSeasonHistoryBody
} from './dto/user-season-history.zod-dto'
import {
  USER_SEASON_HISTORY_FIELDS,
  UserSeasonHistory
} from './entities/user-season-history.entity'

@Injectable()
export class UserSeasonHistoryRepo {
  constructor(private prismaService: PrismaService) {}
  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }
  create(
    {
      createdById,
      data
    }: {
      createdById: number
      data: CreateUserSeasonHistoryBody
    },
    prismaTx?: PrismaClient
  ): Promise<UserSeasonHistory> {
    const client = prismaTx || this.prismaService
    return client.userSeasonHistory.create({
      data: {
        ...data,
        userId: data.userId || createdById
      }
    })
  }

  update(
    {
      id,
      data,
      updatedById
    }: {
      id: number
      data: UpdateUserSeasonHistoryBody
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<UserSeasonHistory> {
    const client = prismaTx || this.prismaService
    return client.userSeasonHistory.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...data
      }
    })
  }

  delete(
    id: number,
    isHard?: boolean,
    prismaTx?: PrismaClient
  ): Promise<UserSeasonHistory> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.userSeasonHistory.delete({
          where: { id }
        })
      : client.userSeasonHistory.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date()
          }
        })
  }

  async list(pagination: PaginationQuery) {
    const { where, orderBy } = parseQs(pagination.qs, USER_SEASON_HISTORY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.userSeasonHistory.count({
        where: filterWhere
      }),
      this.prismaService.userSeasonHistory.findMany({
        where: filterWhere,

        orderBy,
        skip,
        take
      })
    ])

    return {
      results: data,
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }

  findById(id: number): Promise<UserSeasonHistory | null> {
    return this.prismaService.userSeasonHistory.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findSeasonNowByUserId(userId: number): Promise<UserSeasonHistory | null> {
    return this.prismaService.userSeasonHistory.findFirst({
      where: {
        userId,
        deletedAt: null
      }
    })
  }

  checkUserHasSeasonHistoryInSeason(
    userId: number,
    seasonId: number
  ): Promise<UserSeasonHistory | null> {
    return this.prismaService.userSeasonHistory.findFirst({
      where: {
        userId,
        seasonId,
        deletedAt: null
      }
    })
  }

  /**
   * Find the most recent season history for user that has unclaimed rewards
   * @param userId - User ID to check
   * @returns Season history with season and reward details, or null
   */
  async findLatestUnclaimedSeasonHistory(userId: number) {
    return this.prismaService.userSeasonHistory.findFirst({
      where: {
        userId,
        deletedAt: null,
        rewardsClaimed: RewardClaimStatus.CLAIMED,
        finalElo: { not: null }, // Must be finalized
        seasonRankRewardId: { not: null } // Must have reward assigned
      },
      orderBy: {
        season: { endDate: 'desc' } // Most recent season first
      },
      include: {
        season: {
          include: {
            nameTranslations: true
          }
        },
        seasonRankReward: {
          include: {
            rewards: {
              include: {
                nameTranslations: true
              }
            }
          }
        }
      }
    })
  }

  /**
   * Find season rank reward with all its rewards
   * @param seasonRankRewardId - Season rank reward ID
   * @returns Season rank reward with rewards
   */
  async findSeasonRankRewardWithRewards(seasonRankRewardId: number) {
    return this.prismaService.seasonRankReward.findUnique({
      where: { id: seasonRankRewardId },
      include: {
        rewards: true
      }
    })
  }

  async getInfoPreSeaonUserSeasonHistory(
    userId: number
  ): Promise<UserSeasonHistory | null> {
    return this.prismaService.userSeasonHistory.findFirst({
      where: {
        userId,
        deletedAt: null
      },
      orderBy: { season: { endDate: 'desc' } }
    })
  }
}
