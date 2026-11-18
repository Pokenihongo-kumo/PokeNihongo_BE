import {
  FeatureKeyType,
  UserSubscriptionStatus,
  UserSubscriptionStatusType
} from '@/common/constants/subscription.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateUserSubscriptionBodyType,
  USER_SEASON_HISTORY_FIELDS,
  UpdateUserSubscriptionBodyType,
  UserSubscriptionType
} from './entities/user-subscription.entity'

@Injectable()
export class UserSubscriptionRepo {
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
      data: CreateUserSubscriptionBodyType & { userId: number }
    },
    prismaTx?: PrismaClient
  ): Promise<UserSubscriptionType> {
    const client = prismaTx || this.prismaService
    return client.userSubscription.create({
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
      data: UpdateUserSubscriptionBodyType
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<UserSubscriptionType> {
    const client = prismaTx || this.prismaService
    return client.userSubscription.update({
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
  ): Promise<UserSubscriptionType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.userSubscription.delete({
          where: { id }
        })
      : client.userSubscription.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date()
          }
        })
  }

  async list(pagination: PaginationQueryType) {
    const { where, orderBy } = parseQs(pagination.qs, USER_SEASON_HISTORY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.userSubscription.count({
        where: filterWhere
      }),
      this.prismaService.userSubscription.findMany({
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

  async getUserSubWithSubPlan(
    pagination: PaginationQueryType,
    userId: number,
    langId?: number
  ) {
    const { where, orderBy } = parseQs(pagination.qs, USER_SEASON_HISTORY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere: any = {
      deletedAt: null,
      userId,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.userSubscription.count({ where: filterWhere }),
      this.prismaService.userSubscription.findMany({
        where: filterWhere,
        include: {
          invoice: true,
          subscriptionPlan: {
            include: {
              subscription: {
                include: {
                  nameTranslations: { select: { value: true, languageId: true } },
                  descriptionTranslations: { select: { value: true, languageId: true } }
                }
              }
            }
          }
        },
        orderBy,
        skip,
        take
      })
    ])

    const results = data.map((us: any) => {
      const plan = us.subscriptionPlan
      if (!plan || !plan.subscription) return us
      const sub = plan.subscription
      const { nameTranslations, descriptionTranslations, ...subRest } = sub

      const nameTranslation = langId
        ? (nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
          sub.nameKey)
        : sub.nameKey
      const descriptionTranslation = langId
        ? (descriptionTranslations?.find((t: any) => t.languageId === langId)?.value ??
          sub.descriptionKey)
        : sub.descriptionKey

      return {
        ...us,
        subscriptionPlan: {
          ...plan,
          subscription: {
            ...subRest,
            nameTranslations,
            descriptionTranslations,
            nameTranslation,
            descriptionTranslation
          }
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

  findById(id: number): Promise<UserSubscriptionType | null> {
    return this.prismaService.userSubscription.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  /**
   * Lấy chi tiết user subscription kèm invoice (payments) và user (email, name)
   */
  findDetailById(id: number) {
    return this.prismaService.userSubscription.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        invoice: {
          include: {
            payments: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        subscriptionPlan: {
          include: {
            subscription: {
              include: {
                nameTranslations: { select: { value: true, languageId: true } },
                descriptionTranslations: { select: { value: true, languageId: true } }
              }
            }
          }
        }
      }
    })
  }

  findDetailByInvoiceId(invoiceId: number) {
    return this.prismaService.userSubscription.findUnique({
      where: {
        invoiceId,
        deletedAt: null
      },
      include: {
        invoice: {
          include: {
            payments: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        subscriptionPlan: {
          include: {
            subscription: {
              include: {
                nameTranslations: { select: { value: true, languageId: true } },
                descriptionTranslations: { select: { value: true, languageId: true } }
              }
            }
          }
        }
      }
    })
  }

  findActiveByUserIdPlanIdAndStatus(
    userId: number,
    planId: number,
    status: UserSubscriptionStatusType
  ): Promise<UserSubscriptionType | null> {
    return this.prismaService.userSubscription.findFirst({
      where: {
        userId,
        subscriptionPlanId: planId,
        status,
        deletedAt: null
      }
    })
  }

  findByInvoiceId(invoiceId: number): Promise<UserSubscriptionType | null> {
    return this.prismaService.userSubscription.findFirst({
      where: {
        invoiceId,
        deletedAt: null
      }
    })
  }

  async findActiveByUserIdWithfeatureKey(userId: number, featureKey: FeatureKeyType) {
    return this.prismaService.userSubscription.findMany({
      where: {
        deletedAt: null,
        userId,
        status: 'ACTIVE'
      },
      include: {
        subscriptionPlan: {
          include: {
            subscription: {
              include: {
                features: {
                  where: {
                    feature: {
                      featureKey
                    }
                  },
                  include: {
                    feature: true
                  }
                }
              }
            }
          }
        }
      }
    })
  }

  async checkActiveSubscriptionByUserId(userId: number) {
    const activeSubs = await this.prismaService.userSubscription.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        deletedAt: null
      },
      include: {
        subscriptionPlan: {
          include: {
            subscription: {
              include: {
                features: {
                  include: { feature: true }
                }
              }
            }
          }
        }
      }
    })

    let canRead = false
    let canListen = false
    let isUltra = false
    let ultraExpiresAt: Date | null = null

    for (const us of activeSubs as any[]) {
      const subscription = us?.subscriptionPlan?.subscription
      if (!subscription) continue

      // Check ULTRA tag
      if (subscription.tagName === 'ULTRA') {
        isUltra = true
        const exp = us.expiresAt || null
        if (exp && (!ultraExpiresAt || new Date(exp) > new Date(ultraExpiresAt))) {
          ultraExpiresAt = exp
        }
      }

      // Check features
      const features = subscription.features || []
      for (const sf of features) {
        const key = sf?.feature?.featureKey
        if (key === 'UNLOCK_READING') canRead = true
        if (key === 'UNLOCK_LISTENING') canListen = true
      }
    }

    return {
      canRead,
      canListen,
      isUltra,
      ultraExpiresAt
    }
  }

  async getListFeatureOfUser(userId: number): Promise<{ featureKey: FeatureKeyType }[]> {
    const activeSubs = await this.prismaService.userSubscription.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        deletedAt: null
      },
      include: {
        subscriptionPlan: {
          include: {
            subscription: {
              include: {
                features: {
                  include: { feature: true }
                }
              }
            }
          }
        }
      }
    })
    const featureKeySet = new Set<FeatureKeyType>()

    for (const us of activeSubs as any[]) {
      const subscription = us?.subscriptionPlan?.subscription
      if (!subscription) continue
      const features = subscription.features || []
      for (const sf of features) {
        const key = sf?.feature?.featureKey
        if (key) featureKeySet.add(key)
      }
    }
    return Array.from(featureKeySet).map((key) => ({ featureKey: key }))
  }

  findByUserAndInvoice(
    userId: number,
    invoiceId: number
  ): Promise<UserSubscriptionType | null> {
    return this.prismaService.userSubscription.findFirst({
      where: {
        userId,
        invoiceId,
        deletedAt: null
      }
    })
  }

  // ---- Expiry cron (HandleUserSubscriptionCronjob) ----

  findExpiredActive(now: Date) {
    return this.prismaService.userSubscription.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          not: null,
          lt: now // expiresAt < now (expired)
        },
        deletedAt: null
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true
      }
    })
  }

  cancelByIds(ids: number[]) {
    return this.prismaService.userSubscription.updateMany({
      where: {
        id: { in: ids }
      },
      data: {
        status: 'CANCELED'
      }
    })
  }

  findActiveExpiringBetween(startOfTargetDay: Date, endOfTargetDay: Date) {
    return this.prismaService.userSubscription.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          not: null,
          gte: startOfTargetDay,
          lte: endOfTargetDay
        },
        deletedAt: null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        subscriptionPlan: {
          select: {
            id: true,
            subscription: {
              select: {
                nameKey: true,
                nameTranslations: {
                  where: {
                    language: {
                      code: 'vi'
                    }
                  },
                  select: {
                    value: true
                  }
                }
              }
            }
          }
        }
      }
    })
  }

  // The invoice was cancelled: its subscription, if still waiting, failed
  failPendingPayment(invoiceId: number, prismaTx: PrismaClient) {
    return prismaTx.userSubscription.updateMany({
      where: { invoiceId, status: UserSubscriptionStatus.PENDING_PAYMENT },
      data: { status: UserSubscriptionStatus.PAYMENT_FAILED }
    })
  }
}
