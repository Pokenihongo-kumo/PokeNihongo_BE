import { UserAchievementStatus } from '@/common/constants/achievement.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateUserAchievementBody,
  USER_GACHA_PITY_FIELDS,
  UpdateUserAchievementBody,
  UserAchievement
} from './entities/user-achievement.entity'

@Injectable()
export class UserAchievementRepo {
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
      data: CreateUserAchievementBody
    },
    prismaTx?: PrismaClient
  ): Promise<UserAchievement> {
    const client = prismaTx || this.prismaService
    return client.userAchievement.create({
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
      data: UpdateUserAchievementBody
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<UserAchievement> {
    const client = prismaTx || this.prismaService
    return client.userAchievement.update({
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
  ): Promise<UserAchievement> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.userAchievement.delete({
          where: { id }
        })
      : client.userAchievement.update({
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
    const { where, orderBy } = parseQs(pagination.qs, USER_GACHA_PITY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.userAchievement.count({
        where: filterWhere
      }),
      this.prismaService.userAchievement.findMany({
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

  findById(id: number): Promise<UserAchievement | null> {
    return this.prismaService.userAchievement.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  // ---- Achievement screen and claiming ----

  countLiveAchievementsInGroup(groupId: number) {
    return this.prismaService.achievement.count({
      where: { groupId: groupId, deletedAt: null, isActive: true }
    })
  }

  pageLiveAchievementsInGroup(groupId: number, skip: number, take: number) {
    return this.prismaService.achievement.findMany({
      where: { groupId: groupId, deletedAt: null, isActive: true },
      include: {
        nameTranslations: { select: { value: true, languageId: true } },
        reward: {
          include: { nameTranslations: { select: { value: true, languageId: true } } }
        }
      },
      orderBy: [{ achievementTierType: 'asc' }, { id: 'asc' }],
      skip,
      take
    })
  }

  findForUserAndAchievements(userId: number, achievementIds: number[]) {
    return this.prismaService.userAchievement.findMany({
      where: { userId, achievementId: { in: achievementIds }, deletedAt: null }
    })
  }

  findLiveWithReward(id: number) {
    return this.prismaService.userAchievement.findUnique({
      where: { id, deletedAt: null },
      include: {
        achievement: {
          include: {
            reward: true
          }
        }
      }
    })
  }

  // Completed, waiting for its claim (a claimed one keeps CLAIMED)
  markCompleted({
    id,
    currentStatus,
    achievedAt
  }: {
    id: number
    currentStatus: string
    achievedAt: Date | null | undefined
  }) {
    return this.prismaService.userAchievement.update({
      where: { id: id },
      data: {
        status:
          currentStatus === UserAchievementStatus.CLAIMED
            ? currentStatus
            : UserAchievementStatus.COMPLETED_NOT_CLAIMED,
        achievedAt: achievedAt ?? new Date()
      }
    })
  }
}
