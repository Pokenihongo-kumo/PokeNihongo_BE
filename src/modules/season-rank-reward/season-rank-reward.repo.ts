import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateSeasonRankRewardBody,
  SeasonRankReward,
  USER_SEASON_HISTORY_FIELDS,
  UpdateSeasonRankRewardBody
} from './entities/season-rank-reward.entity'

@Injectable()
export class SeasonRankRewardRepo {
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
      data: CreateSeasonRankRewardBody
    },
    prismaTx?: PrismaClient
  ): Promise<SeasonRankReward> {
    const client = prismaTx || this.prismaService
    return client.seasonRankReward.create({
      data: {
        ...data,
        createdById
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
      data: UpdateSeasonRankRewardBody
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<SeasonRankReward> {
    const client = prismaTx || this.prismaService
    return client.seasonRankReward.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...data,
        updatedById
      }
    })
  }

  delete(
    id: number,
    isHard?: boolean,
    prismaTx?: PrismaClient
  ): Promise<SeasonRankReward> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.seasonRankReward.delete({
          where: { id }
        })
      : client.seasonRankReward.update({
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
      this.prismaService.seasonRankReward.count({
        where: filterWhere
      }),
      this.prismaService.seasonRankReward.findMany({
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

  findById(id: number): Promise<SeasonRankReward | null> {
    return this.prismaService.seasonRankReward.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  // ---- Replacing a season's rank rewards (updateByList, one transaction) ----

  deleteBySeason(seasonId: number, prismaTx: PrismaClient) {
    return prismaTx.seasonRankReward.deleteMany({ where: { seasonId } })
  }

  // Which of these reward ids exist
  findRewardIds(ids: number[], prismaTx: PrismaClient) {
    return prismaTx.reward.findMany({
      where: { id: { in: ids } },
      select: { id: true }
    })
  }

  createWithRewards(
    {
      seasonId,
      rankName,
      order,
      rewardIds,
      updatedById
    }: {
      seasonId: number
      rankName: string
      order: number | null
      rewardIds: number[]
      updatedById: number
    },
    prismaTx: PrismaClient
  ) {
    return prismaTx.seasonRankReward.create({
      data: {
        seasonId,
        rankName: rankName as any,
        order: order,
        createdById: updatedById,
        updatedById,
        rewards: {
          connect: rewardIds.map((rid) => ({ id: rid }))
        }
      }
    })
  }

  listBySeason(seasonId: number, prismaTx: PrismaClient) {
    return prismaTx.seasonRankReward.findMany({
      where: { seasonId },
      orderBy: [{ rankName: 'asc' }, { order: 'asc' }]
    })
  }
}
