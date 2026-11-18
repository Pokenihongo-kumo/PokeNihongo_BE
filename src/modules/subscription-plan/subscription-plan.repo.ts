import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateSubscriptionPlanBody,
  SubscriptionPlan,
  USER_GACHA_PITY_FIELDS,
  UpdateSubscriptionPlanBody
} from './entities/subscription-plan.entity'

@Injectable()
export class SubscriptionPlanRepo {
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
      data: CreateSubscriptionPlanBody
    },
    prismaTx?: PrismaClient
  ): Promise<SubscriptionPlan> {
    const client = prismaTx || this.prismaService
    return client.subscriptionPlan.create({
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
      data: UpdateSubscriptionPlanBody
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<SubscriptionPlan> {
    const client = prismaTx || this.prismaService
    return client.subscriptionPlan.update({
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
  ): Promise<SubscriptionPlan> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.subscriptionPlan.delete({
          where: { id }
        })
      : client.subscriptionPlan.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date()
          }
        })
  }

  async list(pagination: PaginationQuery, langId?: number) {
    const { where, orderBy } = parseQs(pagination.qs, USER_GACHA_PITY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.subscriptionPlan.count({
        where: filterWhere
      }),
      this.prismaService.subscriptionPlan.findMany({
        where: filterWhere,
        include: {
          subscription: {
            include: {
              nameTranslations: {
                select: { value: true, languageId: true }
              },
              descriptionTranslations: {
                select: { value: true, languageId: true }
              }
            }
          }
        },
        orderBy,
        skip,
        take
      })
    ])

    // Map results to include subscription nameTranslation and descriptionTranslation
    const results = data.map((d: any) => {
      const { subscription, ...rest } = d
      if (!subscription) return d

      const { nameTranslations, descriptionTranslations, ...subRest } = subscription

      // Find single translation for current langId if provided
      const nameTranslation = langId
        ? (nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
          subscription.nameKey)
        : subscription.nameKey

      const descriptionTranslation = langId
        ? (descriptionTranslations?.find((t: any) => t.languageId === langId)?.value ??
          subscription.descriptionKey)
        : subscription.descriptionKey

      return {
        ...rest,
        subscription: {
          ...subRest,
          nameTranslations, // keep for service-level conversion
          descriptionTranslations, // keep for service-level conversion
          nameTranslation,
          descriptionTranslation
        }
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

  async findById(id: number, langId?: number): Promise<any | null> {
    const plan = await this.prismaService.subscriptionPlan.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        subscription: {
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
            }
          }
        }
      }
    })

    if (!plan) return null

    const { subscription, ...rest } = plan as any
    if (!subscription) return plan

    const { nameTranslations, descriptionTranslations, features, ...subRest } =
      subscription

    // Find single translation for current langId if provided
    const nameTranslation = langId
      ? (nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
        subscription.nameKey)
      : subscription.nameKey

    const descriptionTranslation = langId
      ? (descriptionTranslations?.find((t: any) => t.languageId === langId)?.value ??
        subscription.descriptionKey)
      : subscription.descriptionKey

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
          nameTranslations: featureNameTrans, // keep for service conversion
          nameTranslation: featureNameTranslation
        }
      }
    })

    return {
      ...rest,
      subscription: {
        ...subRest,
        nameTranslations, // keep for service-level conversion
        descriptionTranslations, // keep for service-level conversion
        nameTranslation,
        descriptionTranslation,
        features: processedFeatures
      }
    }
  }

  getById(id: number): Promise<SubscriptionPlan | null> {
    return this.prismaService.subscriptionPlan.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  async getUserActivePlanIds(userId: number): Promise<number[]> {
    const userSubscriptions = await this.prismaService.userSubscription.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        deletedAt: null
      },
      select: {
        subscriptionPlanId: true
      }
    })

    return userSubscriptions.map((us) => us.subscriptionPlanId)
  }

  async getSubscriptionPurchaseCounts(): Promise<Record<number, number>> {
    const counts = await this.prismaService.userSubscription.groupBy({
      by: ['subscriptionPlanId'],
      _count: {
        id: true
      },
      where: {
        deletedAt: null
      }
    })

    // Build a map of subscriptionPlanId to count
    const planCounts: Record<number, number> = {}
    counts.forEach((c) => {
      planCounts[c.subscriptionPlanId] = c._count.id
    })

    return planCounts
  }
}
