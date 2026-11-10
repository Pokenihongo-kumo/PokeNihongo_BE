import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { SeasonRankRewardType } from '../season-rank-reward/entities/season-rank-reward.entity'
import { CreateTranslationBodyType } from '../translation/entities/translation.entity'
import { UserSeasonHistoryType } from '../user-season-history/entities/user-season-history.entity'
import {
  CreateLeaderboardSeasonBodyType,
  LEADERBOARD_SEASON_FIELDS,
  LeaderboardSeasonType,
  UpdateLeaderboardSeasonBodyType
} from './entities/leaderboard-season.entity'

type LeaderboardSeasonPrismaType = Omit<LeaderboardSeasonType, 'nameKey'> & {
  name: string
}

@Injectable()
export class LeaderboardSeasonRepo {
  constructor(private prismaService: PrismaService) {}

  // Wrapper cho transaction
  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }

  create(
    {
      createdById,
      data
    }: {
      createdById: number | null
      data: CreateLeaderboardSeasonBodyType & { hasOpened: boolean }
    },
    prismaTx?: PrismaClient
  ): Promise<LeaderboardSeasonType> {
    const client = prismaTx || this.prismaService
    return client.leaderboardSeason.create({
      data: {
        ...data,
        createdById
      }
    })
  }

  async update(
    {
      id,
      updatedById,
      data
    }: {
      id: number
      updatedById?: number
      data: UpdateLeaderboardSeasonBodyType & {
        nameTranslations: CreateTranslationBodyType[]
        leaderboardSeasonNameKey: string
        hasOpened: boolean
      }
    },
    prismaTx?: PrismaClient
  ): Promise<LeaderboardSeasonType> {
    const client = prismaTx || this.prismaService
    const { nameTranslations, leaderboardSeasonNameKey, ...leaderboardSeasonData } = data

    const updatedLeaderboardSeason = await client.leaderboardSeason.update({
      where: { id, deletedAt: null },
      data: {
        ...leaderboardSeasonData,
        updatedById
      }
    })

    // Upsert translations riêng
    await Promise.all(
      nameTranslations.map((tr) =>
        client.translation.upsert({
          where: {
            languageId_key: {
              languageId: tr.languageId,
              key: leaderboardSeasonNameKey
            }
          },
          create: {
            languageId: tr.languageId,
            key: leaderboardSeasonNameKey,
            value: tr.value,
            leaderboardSeasonNameKey
          },
          update: {
            value: tr.value
          }
        })
      )
    )

    return updatedLeaderboardSeason
  }

  async delete(
    {
      id,
      deletedById
    }: {
      id: number
      deletedById: number
    },
    isHard?: boolean,
    prismaTx?: PrismaClient
  ): Promise<LeaderboardSeasonType> {
    const client = prismaTx || this.prismaService
    const result = isHard
      ? await this.prismaService.leaderboardSeason.delete({
          where: {
            id
          }
        })
      : await client.leaderboardSeason.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date(),
            deletedById
          }
        })
    return result
  }

  async list(pagination: PaginationQueryType, langId?: number, isAdmin: boolean = false) {
    const { where: rawWhere = {}, orderBy } = parseQs(
      pagination.qs,
      LEADERBOARD_SEASON_FIELDS
    )

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    // Build base where
    const where: any = { deletedAt: null, ...rawWhere }

    // Support filtering by nameTranslation/nameTranslations via relational filter
    const nameFilterRaw =
      (rawWhere as any).nameTranslation ?? (rawWhere as any).nameTranslations
    let childNameIncludeWhere: any = {}
    if (nameFilterRaw && langId) {
      const toContainsFilter = (raw: any) => {
        if (typeof raw === 'object' && raw !== null) {
          const val =
            (raw as any).has ?? (raw as any).contains ?? (raw as any).equals ?? raw
          return { contains: String(val), mode: 'insensitive' as const }
        }
        return { contains: String(raw), mode: 'insensitive' as const }
      }
      const searchFilter = toContainsFilter(nameFilterRaw)
      delete (where as any).nameTranslation
      delete (where as any).nameTranslations
      where.nameTranslations = {
        some: {
          languageId: langId,
          value: searchFilter
        }
      }
      childNameIncludeWhere = { languageId: langId, value: searchFilter }
    } else if (langId) {
      childNameIncludeWhere = { languageId: langId }
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.leaderboardSeason.count({ where }),
      this.prismaService.leaderboardSeason.findMany({
        where,
        include: {
          // Always include all translations with languageId for service-level mapping
          nameTranslations: {
            select: { value: true, languageId: true }
          }
        },
        orderBy,
        skip,
        take
      })
    ])

    // Map results to include nameTranslation and exclude nameTranslations array
    const results = data.map((d: any) => {
      const { nameTranslations, ...rest } = d
      // Find single translation for current langId if provided
      const single = langId
        ? (nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
          d.nameKey)
        : undefined
      return {
        ...rest,
        nameTranslations, // keep raw translations for service to format to all languages
        nameTranslation: single
      }
    })

    return {
      results,
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }
  findById(id: number): Promise<LeaderboardSeasonType | null> {
    return this.prismaService.leaderboardSeason.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findByIdWithLangId(
    id: number,
    isAllLang: boolean,
    langId: number
  ): Promise<LeaderboardSeasonType | null> {
    return this.prismaService.leaderboardSeason.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        nameTranslations: isAllLang
          ? { select: { value: true, languageId: true } }
          : { where: { languageId: langId }, select: { value: true, languageId: true } },
        seasonRankRewards: {
          where: { deletedAt: null },
          select: {
            id: true,
            rankName: true,
            order: true,
            rewards: {
              select: {
                id: true,
                rewardType: true,
                rewardItem: true,
                rewardTarget: true,
                nameTranslations: isAllLang
                  ? { select: { value: true, languageId: true } }
                  : {
                      where: { languageId: langId },
                      select: { value: true, languageId: true }
                    }
              }
            }
          }
        }
      }
    })
  }

  findByIdWithAllLang(id: number) {
    return this.prismaService.leaderboardSeason.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        nameTranslations: {
          select: { id: true, languageId: true, key: true, value: true }
        }
      }
    })
  }

  findActiveSeason(): Promise<LeaderboardSeasonType | null> {
    return this.prismaService.leaderboardSeason.findFirst({
      where: {
        status: 'ACTIVE',
        deletedAt: null
      }
    })
  }

  findActiveSeasonWithLangIdAndUser(
    userId: number,
    langId?: number
  ): Promise<
    | (LeaderboardSeasonType & {
        nameTranslations
        userHistories: UserSeasonHistoryType[]
      })
    | null
  > {
    return this.prismaService.leaderboardSeason.findFirst({
      where: {
        status: 'ACTIVE',
        deletedAt: null
      },
      include: {
        nameTranslations: {
          where: { languageId: langId },
          select: { value: true, languageId: true }
        },
        userHistories: {
          where: { userId, deletedAt: null }
        }
      }
    })
  }

  findWithDetailsWithoutLang(id: number): Promise<
    | (LeaderboardSeasonType & {
        userHistories: UserSeasonHistoryType[]
        seasonRankRewards: SeasonRankRewardType[]
      })
    | null
  > {
    return this.prismaService.leaderboardSeason.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        userHistories: {
          where: { deletedAt: null },
          include: {
            user: {
              select: { id: true, eloscore: true }
            }
          }
        },
        seasonRankRewards: {
          where: { deletedAt: null }
        }
      }
    })
  }

  findLeaderboardSeasonNowWithRewards(
    langId: number,
    isAdmin: boolean
  ): Promise<LeaderboardSeasonType | null> {
    return this.prismaService.leaderboardSeason.findFirst({
      where: {
        status: 'ACTIVE',
        deletedAt: null
      },
      include: {
        nameTranslations: isAdmin
          ? { select: { value: true, languageId: true } }
          : { where: { languageId: langId }, select: { value: true, languageId: true } },
        seasonRankRewards: {
          where: { deletedAt: null },
          select: {
            id: true,
            rankName: true,
            order: true,
            rewards: {
              select: {
                id: true,
                rewardType: true,
                rewardItem: true,
                rewardTarget: true,
                nameTranslations: isAdmin
                  ? { select: { value: true, languageId: true } }
                  : {
                      where: { languageId: langId },
                      select: { value: true, languageId: true }
                    }
              }
            }
          }
        }
      }
    })
  }
}
