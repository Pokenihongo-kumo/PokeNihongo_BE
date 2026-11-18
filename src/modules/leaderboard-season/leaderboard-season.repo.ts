import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { LeaderboardStatus, Prisma, PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { SeasonRankReward } from '../season-rank-reward/entities/season-rank-reward.entity'
import { CreateTranslationBody } from '../translation/dto/translation.zod-dto'
import { UserSeasonHistory } from '../user-season-history/entities/user-season-history.entity'
import {
  CreateLeaderboardSeasonBody,
  UpdateLeaderboardSeasonBody
} from './dto/leaderboard-season.zod-dto'
import {
  LEADERBOARD_SEASON_FIELDS,
  LeaderboardSeason
} from './entities/leaderboard-season.entity'

type LeaderboardSeasonPrismaType = Omit<LeaderboardSeason, 'nameKey'> & {
  name: string
}

const SEASON_TEMPLATE_INCLUDE = {
  nameTranslations: true,
  seasonRankRewards: { include: { rewards: { select: { id: true } } } }
} satisfies Prisma.LeaderboardSeasonInclude

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
      data: CreateLeaderboardSeasonBody & { hasOpened: boolean }
    },
    prismaTx?: PrismaClient
  ): Promise<LeaderboardSeason> {
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
      data: UpdateLeaderboardSeasonBody & {
        nameTranslations: CreateTranslationBody[]
        leaderboardSeasonNameKey: string
        hasOpened: boolean
      }
    },
    prismaTx?: PrismaClient
  ): Promise<LeaderboardSeason> {
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
  ): Promise<LeaderboardSeason> {
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

  async list(pagination: PaginationQuery, langId?: number, isAdmin: boolean = false) {
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
  findById(id: number): Promise<LeaderboardSeason | null> {
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
  ): Promise<LeaderboardSeason | null> {
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

  findActiveSeason(): Promise<LeaderboardSeason | null> {
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
    | (LeaderboardSeason & {
        nameTranslations
        userHistories: UserSeasonHistory[]
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
    | (LeaderboardSeason & {
        userHistories: UserSeasonHistory[]
        seasonRankRewards: SeasonRankReward[]
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
  ): Promise<LeaderboardSeason | null> {
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

  // ---- Rankings (read model, R4: read only) ----

  findLatestByEndDate() {
    return this.prismaService.leaderboardSeason.findFirst({
      where: { deletedAt: null },
      orderBy: { endDate: 'desc' }
    })
  }

  countRankedUsers(whereUsers: Prisma.UserWhereInput) {
    return this.prismaService.user.count({ where: whereUsers })
  }

  pageRankedUsers(whereUsers: Prisma.UserWhereInput, skip: number, take: number) {
    return this.prismaService.user.findMany({
      where: whereUsers,
      orderBy: [{ eloscore: 'desc' }, { name: 'asc' }],
      skip,
      take,
      select: {
        id: true,
        name: true,
        avatar: true,
        eloscore: true
      }
    })
  }

  findRankedUser(userId: number) {
    return this.prismaService.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true, name: true, avatar: true, eloscore: true }
    })
  }

  // Users ahead of this one (higher elo, or same elo and lower id)
  countUsersRankedAbove(
    myUser: { id: number; eloscore: number },
    eloFilter: { gte?: number; lte?: number } | undefined
  ) {
    return this.prismaService.user.count({
      where: {
        deletedAt: null,
        ...(eloFilter ? { eloscore: eloFilter } : {}),
        OR: [
          { eloscore: { gt: myUser.eloscore } },
          {
            eloscore: myUser.eloscore,
            id: { lt: myUser.id }
          }
        ]
      }
    })
  }

  countSeasonHistories(whereTop: Prisma.UserSeasonHistoryWhereInput) {
    return this.prismaService.userSeasonHistory.count({ where: whereTop })
  }

  pageSeasonHistories(
    whereTop: Prisma.UserSeasonHistoryWhereInput,
    skip: number,
    take: number
  ) {
    return this.prismaService.userSeasonHistory.findMany({
      where: whereTop,
      orderBy: [{ finalElo: 'desc' }, { userId: 'asc' }],
      skip,
      take,
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    })
  }

  findSeasonHistory(seasonId: number, userId: number) {
    return this.prismaService.userSeasonHistory.findFirst({
      where: { seasonId, userId, deletedAt: null },
      include: { user: { select: { id: true, name: true, avatar: true } } }
    })
  }

  // Histories ahead of this one (higher final elo, or same and lower user id)
  countHistoriesRankedAbove(
    seasonId: number,
    myHist: { finalElo: number; userId: number },
    eloFilter: { gte?: number; lte?: number } | undefined
  ) {
    return this.prismaService.userSeasonHistory.count({
      where: {
        seasonId,
        deletedAt: null,
        ...(eloFilter ? { finalElo: eloFilter } : {}),
        OR: [
          { finalElo: { gt: myHist.finalElo } },
          {
            finalElo: myHist.finalElo,
            userId: { lt: myHist.userId }
          }
        ]
      }
    })
  }

  // ---- Season cronjob (src/cronjobs/handle-leaderboard-season.cronjob.ts) ----

  findEndedActiveIds(now: Date) {
    return this.prismaService.leaderboardSeason.findMany({
      where: { status: 'ACTIVE', endDate: { lte: now }, deletedAt: null },
      select: { id: true }
    })
  }

  setStatus(id: number, status: LeaderboardStatus) {
    return this.prismaService.leaderboardSeason.update({
      where: { id },
      data: { status }
    })
  }

  findAllPreview() {
    return this.prismaService.leaderboardSeason.findMany({
      where: { status: 'PREVIEW', deletedAt: null }
    })
  }

  countActive() {
    return this.prismaService.leaderboardSeason.count({
      where: { status: 'ACTIVE', deletedAt: null }
    })
  }

  activate(id: number) {
    return this.prismaService.leaderboardSeason.update({
      where: { id },
      data: { status: 'ACTIVE', hasOpened: true }
    })
  }

  // With what a next season copies: name translations and rank rewards (reward ids)
  findActiveForPrecreate() {
    return this.prismaService.leaderboardSeason.findMany({
      where: { status: 'ACTIVE', enablePrecreate: true, deletedAt: null },
      include: SEASON_TEMPLATE_INCLUDE
    })
  }

  findTemplateForPrecreate(id: number) {
    return this.prismaService.leaderboardSeason.findUnique({
      where: { id, deletedAt: null },
      include: SEASON_TEMPLATE_INCLUDE
    })
  }

  findFirstByNameKeyPrefix(prefix: string) {
    return this.prismaService.leaderboardSeason.findFirst({
      where: { nameKey: { startsWith: prefix }, deletedAt: null }
    })
  }

  findPreviewStartingAt(startDate: Date) {
    return this.prismaService.leaderboardSeason.findFirst({
      where: { startDate, status: 'PREVIEW', deletedAt: null }
    })
  }

  createSeason(
    data: Prisma.LeaderboardSeasonUncheckedCreateInput,
    prismaTx?: PrismaClient
  ) {
    const client = prismaTx || this.prismaService
    return client.leaderboardSeason.create({ data })
  }

  // Final nameKey of a season made under a temporary one, with its translations
  setNameKeyWithTranslations(
    id: number,
    nameKey: string,
    upserts: Prisma.TranslationUpsertWithWhereUniqueWithoutLeaderboardSeasonInput[],
    prismaTx?: PrismaClient
  ) {
    const client = prismaTx || this.prismaService
    return client.leaderboardSeason.update({
      where: { id },
      data: {
        nameKey,
        ...(upserts.length ? { nameTranslations: { upsert: upserts } } : {})
      }
    })
  }

  disablePrecreate(id: number) {
    return this.prismaService.leaderboardSeason.update({
      where: { id },
      data: { enablePrecreate: false, precreateBeforeEndDays: 999 }
    })
  }
}
