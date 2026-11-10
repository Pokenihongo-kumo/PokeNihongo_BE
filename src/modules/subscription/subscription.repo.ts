import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CreateTranslationBodyType } from '../translation/entities/translation.entity'
import {
  CreateSubscriptionBodyType,
  LEADERBOARD_SEASON_FIELDS,
  SubscriptionType,
  UpdateSubscriptionBodyType
} from './entities/subscription.entity'

type SubscriptionPrismaType = Omit<SubscriptionType, 'nameKey'> & {
  name: string
}

@Injectable()
export class SubscriptionRepo {
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
      data: CreateSubscriptionBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<SubscriptionType> {
    const client = prismaTx || this.prismaService
    return client.subscription.create({
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
      data: UpdateSubscriptionBodyType & {
        nameTranslations?: CreateTranslationBodyType[]
        subscriptionNameKey?: string
        descriptionTranslations?: CreateTranslationBodyType[]
        subscriptionDescriptionKey?: string
      }
    },
    prismaTx?: PrismaClient
  ): Promise<SubscriptionType> {
    const client = prismaTx || this.prismaService
    const {
      nameTranslations,
      subscriptionNameKey,
      descriptionTranslations,
      subscriptionDescriptionKey,
      ...subscriptionData
    } = data

    const updatedSubscription = await client.subscription.update({
      where: { id, deletedAt: null },
      data: {
        ...subscriptionData,
        updatedById
      }
    })

    // Upsert nameTranslations if provided
    if (nameTranslations && subscriptionNameKey) {
      await Promise.all(
        nameTranslations.map((tr) =>
          client.translation.upsert({
            where: {
              languageId_key: {
                languageId: tr.languageId,
                key: subscriptionNameKey
              }
            },
            create: {
              languageId: tr.languageId,
              key: subscriptionNameKey,
              value: tr.value,
              subscriptionNameKey
            },
            update: {
              value: tr.value
            }
          })
        )
      )
    }

    // Upsert descriptionTranslations if provided
    if (descriptionTranslations && subscriptionDescriptionKey) {
      await Promise.all(
        descriptionTranslations.map((tr) =>
          client.translation.upsert({
            where: {
              languageId_key: {
                languageId: tr.languageId,
                key: subscriptionDescriptionKey
              }
            },
            create: {
              languageId: tr.languageId,
              key: subscriptionDescriptionKey,
              value: tr.value,
              subscriptionDescriptionKey
            },
            update: {
              value: tr.value
            }
          })
        )
      )
    }

    return updatedSubscription
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
  ): Promise<SubscriptionType> {
    const client = prismaTx || this.prismaService
    const result = isHard
      ? await this.prismaService.subscription.delete({
          where: {
            id
          }
        })
      : await client.subscription.update({
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
      this.prismaService.subscription.count({ where }),
      this.prismaService.subscription.findMany({
        where,
        include: {
          // Always include all translations with languageId for service-level mapping
          nameTranslations: {
            select: { value: true, languageId: true }
          },
          descriptionTranslations: {
            select: { value: true, languageId: true }
          },
          features: {
            select: {
              id: true,

              value: true
            }
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
  findById(id: number): Promise<SubscriptionType | null> {
    return this.prismaService.subscription.findUnique({
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
  ): Promise<SubscriptionType | null> {
    return this.prismaService.subscription.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        nameTranslations: isAllLang
          ? { select: { value: true, languageId: true } }
          : { where: { languageId: langId }, select: { value: true, languageId: true } },
        descriptionTranslations: isAllLang
          ? { select: { value: true, languageId: true } }
          : { where: { languageId: langId }, select: { value: true, languageId: true } },
        features: {
          select: {
            id: true,

            value: true
          }
        }
      }
    })
  }

  findByIdWithAllLang(id: number) {
    return this.prismaService.subscription.findUnique({
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

  async getSubscriptionsWithActivePlans(langId?: number) {
    const subscriptions = await this.prismaService.subscription.findMany({
      where: {
        deletedAt: null,
        plans: {
          some: {
            isActive: true,
            deletedAt: null
          }
        }
      },
      include: {
        nameTranslations: {
          select: { value: true, languageId: true }
        },
        descriptionTranslations: {
          select: { value: true, languageId: true }
        },
        features: {
          select: {
            id: true,
            featureId: true,
            value: true,
            feature: {
              select: {
                id: true,
                featureKey: true,
                nameKey: true,
                nameTranslations: {
                  select: { value: true, languageId: true }
                }
              }
            }
          }
        },
        plans: {
          where: {
            isActive: true,
            deletedAt: null
          },
          orderBy: {
            durationInDays: 'asc'
          },
          select: {
            id: true,
            subscriptionId: true,
            price: true,
            type: true,
            durationInDays: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: {
        tagName: 'asc'
      }
    })

    // Map results to include single translations for langId
    return subscriptions.map((sub: any) => {
      const { nameTranslations, descriptionTranslations, features, ...rest } = sub

      const nameTranslation = langId
        ? (nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
          sub.nameKey)
        : sub.nameKey

      const descriptionTranslation = langId
        ? (descriptionTranslations?.find((t: any) => t.languageId === langId)?.value ??
          sub.descriptionKey)
        : sub.descriptionKey

      // Process features to add nameTranslation for each feature
      const processedFeatures = features?.map((f: any) => {
        const { feature, ...featureRest } = f
        if (!feature) return f

        const { nameTranslations: featureNameTrans, ...featureDetails } = feature

        const featureNameTranslation = langId
          ? (featureNameTrans?.find((t: any) => t.languageId === langId)?.value ??
            feature.nameKey)
          : feature.nameKey

        return {
          ...featureRest,
          feature: {
            ...featureDetails,
            nameTranslations: featureNameTrans,
            nameTranslation: featureNameTranslation
          }
        }
      })

      return {
        ...rest,
        nameTranslations,
        descriptionTranslations,
        nameTranslation,
        descriptionTranslation,
        features: processedFeatures
      }
    })
  }
}
