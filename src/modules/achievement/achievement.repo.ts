import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CreateTranslationBodyType } from '../translation/entities/translation.entity'
import {
  ACHIEVEMENT_FIELDS,
  AchievementType,
  CreateAchievementBodyType,
  UpdateAchievementBodyType
} from './entities/achievement.entity'

type AchievementPrismaType = Omit<AchievementType, 'nameKey'> & {
  name: string
}

@Injectable()
export class AchievementRepo {
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
      data: CreateAchievementBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<AchievementType> {
    const client = prismaTx || this.prismaService
    return client.achievement.create({
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
      data: UpdateAchievementBodyType & {
        nameTranslations?: CreateTranslationBodyType[]
        descriptionTranslations?: CreateTranslationBodyType[]
        conditionTextTranslations?: CreateTranslationBodyType[]
        achievementNameKey?: string
        achievementDescriptionKey?: string
        achievementConditionTextKey?: string
      }
    },
    prismaTx?: PrismaClient
  ): Promise<AchievementType> {
    const client = prismaTx || this.prismaService
    const {
      nameTranslations,
      descriptionTranslations,
      conditionTextTranslations,
      achievementNameKey,
      achievementDescriptionKey,
      achievementConditionTextKey,
      ...achievementData
    } = data

    const updatedAchievement = await client.achievement.update({
      where: { id, deletedAt: null },
      data: {
        ...achievementData,
        updatedById
      }
    })

    // Upsert nameTranslations
    if (nameTranslations && achievementNameKey) {
      await Promise.all(
        nameTranslations.map((tr) =>
          client.translation.upsert({
            where: {
              languageId_key: {
                languageId: tr.languageId,
                key: achievementNameKey
              }
            },
            create: {
              languageId: tr.languageId,
              key: achievementNameKey,
              value: tr.value,
              achievementNameKey
            },
            update: {
              value: tr.value
            }
          })
        )
      )
    }

    // Upsert descriptionTranslations
    if (descriptionTranslations && achievementDescriptionKey) {
      await Promise.all(
        descriptionTranslations.map((tr) =>
          client.translation.upsert({
            where: {
              languageId_key: {
                languageId: tr.languageId,
                key: achievementDescriptionKey
              }
            },
            create: {
              languageId: tr.languageId,
              key: achievementDescriptionKey,
              value: tr.value,
              achievementDescriptionKey
            },
            update: {
              value: tr.value
            }
          })
        )
      )
    }

    // Upsert conditionTextTranslations
    if (conditionTextTranslations && achievementConditionTextKey) {
      await Promise.all(
        conditionTextTranslations.map((tr) =>
          client.translation.upsert({
            where: {
              languageId_key: {
                languageId: tr.languageId,
                key: achievementConditionTextKey
              }
            },
            create: {
              languageId: tr.languageId,
              key: achievementConditionTextKey,
              value: tr.value,
              achievementConditionTextKey
            },
            update: {
              value: tr.value
            }
          })
        )
      )
    }

    return updatedAchievement
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
  ): Promise<AchievementType> {
    const client = prismaTx || this.prismaService
    const result = isHard
      ? await this.prismaService.achievement.delete({
          where: {
            id
          }
        })
      : await client.achievement.update({
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
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, ACHIEVEMENT_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    // Build base where
    const where: any = { deletedAt: null, ...rawWhere }
    // Non-admin should only see active achievements
    if (!isAdmin) {
      where.isActive = true
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
      this.prismaService.achievement.count({ where }),
      this.prismaService.achievement.findMany({
        where,
        include: {
          // Include all three translation types
          nameTranslations: {
            select: { value: true, languageId: true }
          },
          descriptionTranslations: {
            select: { value: true, languageId: true }
          },
          conditionTextTranslations: {
            select: { value: true, languageId: true }
          }
        },
        orderBy,
        skip,
        take
      })
    ])

    // Map results to include single translations for current language
    const results = data.map((d: any) => {
      const {
        nameTranslations,
        descriptionTranslations,
        conditionTextTranslations,
        ...rest
      } = d

      // Find single translation for current langId if provided
      const nameTranslation = langId
        ? (nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
          d.nameKey)
        : undefined

      const descriptionTranslation = langId
        ? (descriptionTranslations?.find((t: any) => t.languageId === langId)?.value ??
          d.descriptionKey)
        : undefined

      const conditionTextTranslation = langId
        ? (conditionTextTranslations?.find((t: any) => t.languageId === langId)?.value ??
          d.conditionTextKey)
        : undefined

      return {
        ...rest,
        nameTranslations, // keep raw translations for service to format
        descriptionTranslations,
        conditionTextTranslations,
        nameTranslation,
        descriptionTranslation,
        conditionTextTranslation
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
  findById(id: number): Promise<AchievementType | null> {
    return this.prismaService.achievement.findUnique({
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
  ): Promise<AchievementType | null> {
    return this.prismaService.achievement.findUnique({
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
        descriptionTranslations: isAllLang
          ? { select: { value: true, languageId: true } }
          : { where: { languageId: langId }, select: { value: true, languageId: true } },
        conditionTextTranslations: isAllLang
          ? { select: { value: true, languageId: true } }
          : { where: { languageId: langId }, select: { value: true, languageId: true } },
        reward: {
          include: {
            nameTranslations: isAllLang
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
    return this.prismaService.achievement.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        nameTranslations: {
          select: { id: true, languageId: true, key: true, value: true }
        },
        descriptionTranslations: {
          select: { id: true, languageId: true, key: true, value: true }
        },
        conditionTextTranslations: {
          select: { id: true, languageId: true, key: true, value: true }
        }
      }
    })
  }
}
