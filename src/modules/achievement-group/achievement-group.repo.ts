import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { AchievementType } from '../achievement/entities/achievement.entity'
import { CreateTranslationBodyType } from '../translation/entities/translation.entity'
import {
  ACHIEVEMENT_GROUP_FIELDS,
  AchievementGroupType,
  CreateAchievementGroupBodyType,
  UpdateAchievementGroupBodyType
} from './entities/achievement-group.entity'

type AchievementGroupPrismaType = Omit<AchievementGroupType, 'nameKey'> & {
  name: string
}

@Injectable()
export class AchievementGroupRepo {
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
      data: CreateAchievementGroupBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<AchievementGroupType> {
    const client = prismaTx || this.prismaService
    return client.achievementGroup.create({
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
      data: UpdateAchievementGroupBodyType & {
        nameTranslations: CreateTranslationBodyType[]
        achievementGroupNameKey: string
      }
    },
    prismaTx?: PrismaClient
  ): Promise<AchievementGroupType> {
    const client = prismaTx || this.prismaService
    const { nameTranslations, achievementGroupNameKey, ...achievementGroupData } = data

    const updatedAchievementGroup = await client.achievementGroup.update({
      where: { id, deletedAt: null },
      data: {
        ...achievementGroupData,
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
              key: achievementGroupNameKey
            }
          },
          create: {
            languageId: tr.languageId,
            key: achievementGroupNameKey,
            value: tr.value,
            achievementGroupNameKey
          },
          update: {
            value: tr.value
          }
        })
      )
    )

    return updatedAchievementGroup
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
  ): Promise<AchievementGroupType> {
    const client = prismaTx || this.prismaService
    const result = isHard
      ? await this.prismaService.achievementGroup.delete({
          where: {
            id
          }
        })
      : await client.achievementGroup.update({
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
      ACHIEVEMENT_GROUP_FIELDS
    )

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    // Build base where
    const where: any = { deletedAt: null, ...rawWhere }
    // Non-admin should only see active groups
    if (!isAdmin) {
      ;(where as any).isActive = true
    }

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
      this.prismaService.achievementGroup.count({ where }),
      this.prismaService.achievementGroup.findMany({
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
  findById(id: number): Promise<AchievementGroupType | null> {
    return this.prismaService.achievementGroup.findUnique({
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
  ): Promise<(AchievementGroupType & { achievements: AchievementType[] }) | null> {
    return this.prismaService.achievementGroup.findUnique({
      where: {
        id,
        deletedAt: null,
        // Non-admin consumers (isAllLang=false) only fetch active records
        ...(isAllLang ? {} : { isActive: true })
      },
      include: {
        nameTranslations: isAllLang
          ? { select: { value: true, languageId: true } }
          : { where: { languageId: langId }, select: { value: true, languageId: true } },
        achievements: {
          include: {
            nameTranslations: isAllLang
              ? { select: { value: true, languageId: true } }
              : {
                  where: { languageId: langId },
                  select: { value: true, languageId: true }
                },
            descriptionTranslations: isAllLang
              ? { select: { value: true, languageId: true } }
              : {
                  where: { languageId: langId },
                  select: { value: true, languageId: true }
                },
            conditionTextTranslations: isAllLang
              ? { select: { value: true, languageId: true } }
              : {
                  where: { languageId: langId },
                  select: { value: true, languageId: true }
                }
          }
        }
      }
    })
  }

  findByIdWithAllLang(id: number) {
    return this.prismaService.achievementGroup.findUnique({
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
}
