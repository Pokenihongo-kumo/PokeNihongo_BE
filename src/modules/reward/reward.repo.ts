import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CreateTranslationBodyType } from '../translation/entities/translation.entities'
import {
  CreateRewardBodyType,
  REWARD_FIELDS,
  RewardType,
  UpdateRewardBodyType
} from './entities/reward.entity'

type RewardPrismaType = Omit<RewardType, 'nameKey'> & { name: string }

@Injectable()
export class RewardRepo {
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
      data: CreateRewardBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<RewardType> {
    const client = prismaTx || this.prismaService
    return client.reward.create({
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
      data: UpdateRewardBodyType & {
        nameTranslations: CreateTranslationBodyType[]
        rewardNameKey: string
      }
    },
    prismaTx?: PrismaClient
  ): Promise<RewardType> {
    const client = prismaTx || this.prismaService
    const { nameTranslations, rewardNameKey, ...rewardData } = data

    const updatedReward = await client.reward.update({
      where: { id, deletedAt: null },
      data: {
        ...rewardData,
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
              key: rewardNameKey
            }
          },
          create: {
            languageId: tr.languageId,
            key: rewardNameKey,
            value: tr.value,
            rewardNameKey
          },
          update: {
            value: tr.value
          }
        })
      )
    )

    return updatedReward
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
  ): Promise<RewardType> {
    const client = prismaTx || this.prismaService
    const result = isHard
      ? await client.reward.delete({
          where: {
            id
          }
        })
      : await client.reward.update({
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

  async list(pagination: PaginationQueryType, langId?: number) {
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, REWARD_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    // Build base where
    const where: any = { ...rawWhere }

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
      this.prismaService.reward.count({ where }),
      this.prismaService.reward.findMany({
        where,
        include: {
          nameTranslations: langId
            ? {
                where: childNameIncludeWhere,
                select: { value: true }
              }
            : undefined
        },
        orderBy,
        skip,
        take
      })
    ])

    // Map results to include nameTranslation and exclude nameTranslations array
    const results = data.map((d: any) => {
      const { nameTranslations, ...rest } = d
      return {
        ...rest,
        nameTranslation: langId ? (nameTranslations?.[0]?.value ?? d.nameKey) : undefined
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

  async getListWithAllLang(pagination: PaginationQueryType, langId?: number) {
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, REWARD_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    // Build base where
    const where: any = { ...rawWhere }

    // Support filtering by name value in a specific language (if provided)
    const nameFilterRaw =
      (rawWhere as any).nameTranslation ?? (rawWhere as any).nameTranslations
    if (nameFilterRaw) {
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
      where.nameTranslations = langId
        ? {
            some: {
              languageId: langId,
              value: searchFilter
            }
          }
        : {
            some: {
              value: searchFilter
            }
          }
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.reward.count({ where }),
      this.prismaService.reward.findMany({
        where,
        include: {
          // Return all language translations for admin view
          nameTranslations: {
            select: { languageId: true, value: true, key: true, id: true }
          }
        },
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

  findById(id: number): Promise<RewardType | null> {
    return this.prismaService.reward.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findDelId(id: number): Promise<RewardType | null> {
    return this.prismaService.reward.findUnique({
      where: {
        id
      }
    })
  }

  findManyByIds(ids: number[]): Promise<RewardType[]> {
    return this.prismaService.reward.findMany({
      where: {
        id: { in: ids },
        deletedAt: null
      }
    })
  }

  findByIdWithLangId(id: number, langId: number): Promise<RewardType | null> {
    return this.prismaService.reward.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        nameTranslations: {
          where: {
            languageId: langId
          }
        }
      }
    })
  }

  findByIdWithAllLang(id: number) {
    return this.prismaService.reward.findUnique({
      where: {
        id
      },
      include: {
        nameTranslations: {
          select: { id: true, languageId: true, key: true, value: true }
        }
      }
    })
  }
}
