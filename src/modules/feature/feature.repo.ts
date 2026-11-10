import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CreateTranslationBodyType } from '../translation/entities/translation.entity'
import {
  CreateFeatureBodyType,
  FeatureType,
  LEADERBOARD_SEASON_FIELDS,
  UpdateFeatureBodyType
} from './entities/feature.entity'

type FeaturePrismaType = Omit<FeatureType, 'nameKey'> & {
  name: string
}

@Injectable()
export class FeatureRepo {
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
      data: CreateFeatureBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<FeatureType> {
    const client = prismaTx || this.prismaService
    return client.feature.create({
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
      data: UpdateFeatureBodyType & {
        nameTranslations?: CreateTranslationBodyType[]
        featureNameKey?: string
      }
    },
    prismaTx?: PrismaClient
  ): Promise<FeatureType> {
    const client = prismaTx || this.prismaService
    const {
      nameTranslations,
      featureNameKey,

      ...featureData
    } = data

    const updatedFeature = await client.feature.update({
      where: { id, deletedAt: null },
      data: {
        ...featureData,
        updatedById
      }
    })

    // Upsert nameTranslations if provided
    if (nameTranslations && featureNameKey) {
      await Promise.all(
        nameTranslations.map((tr) =>
          client.translation.upsert({
            where: {
              languageId_key: {
                languageId: tr.languageId,
                key: featureNameKey
              }
            },
            create: {
              languageId: tr.languageId,
              key: featureNameKey,
              value: tr.value,
              featureNameKey
            },
            update: {
              value: tr.value
            }
          })
        )
      )
    }

    return updatedFeature
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
  ): Promise<FeatureType> {
    const client = prismaTx || this.prismaService
    const result = isHard
      ? await this.prismaService.feature.delete({
          where: {
            id
          }
        })
      : await client.feature.update({
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
      this.prismaService.feature.count({ where }),
      this.prismaService.feature.findMany({
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

    // Map results to include nameTranslation, descriptionTranslation and keep raw translations arrays
    const results = data.map((d: any) => {
      const { nameTranslations, descriptionTranslations, ...rest } = d
      // Find single translation for current langId if provided
      const singleNameTrans = langId
        ? (nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
          d.nameKey)
        : undefined
      const singleDescTrans = langId
        ? (descriptionTranslations?.find((t: any) => t.languageId === langId)?.value ??
          d.descriptionKey)
        : undefined
      return {
        ...rest,
        nameTranslations, // keep raw translations for service to format to all languages
        descriptionTranslations, // keep raw translations for service to format to all languages
        nameTranslation: singleNameTrans,
        descriptionTranslation: singleDescTrans
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
  findById(id: number): Promise<FeatureType | null> {
    return this.prismaService.feature.findUnique({
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
  ): Promise<FeatureType | null> {
    return this.prismaService.feature.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        nameTranslations: isAllLang
          ? { select: { value: true, languageId: true } }
          : { where: { languageId: langId }, select: { value: true, languageId: true } }
      }
    })
  }

  findByIdWithAllLang(id: number) {
    return this.prismaService.feature.findUnique({
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
