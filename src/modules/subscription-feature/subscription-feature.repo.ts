import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateSubscriptionFeatureBody,
  UpdateSubscriptionFeatureBody
} from './dto/subscription-feature.zod-dto'
import {
  SubscriptionFeature,
  USER_GACHA_PITY_FIELDS
} from './entities/subscription-feature.entity'

@Injectable()
export class SubscriptionFeatureRepo {
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
      data: CreateSubscriptionFeatureBody
    },
    prismaTx?: PrismaClient
  ): Promise<SubscriptionFeature> {
    const client = prismaTx || this.prismaService
    return client.subscriptionFeature.create({
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
      data: UpdateSubscriptionFeatureBody
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<SubscriptionFeature> {
    const client = prismaTx || this.prismaService
    return client.subscriptionFeature.update({
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
  ): Promise<SubscriptionFeature> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.subscriptionFeature.delete({
          where: { id }
        })
      : client.subscriptionFeature.update({
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
      this.prismaService.subscriptionFeature.count({
        where: filterWhere
      }),
      this.prismaService.subscriptionFeature.findMany({
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

  findById(id: number): Promise<SubscriptionFeature | null> {
    return this.prismaService.subscriptionFeature.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  // ---- Replacing a subscription's features (updateByList, one transaction) ----

  deleteBySubscription(subscriptionId: number, prismaTx: PrismaClient) {
    return prismaTx.subscriptionFeature.deleteMany({
      where: { subscriptionId }
    })
  }

  // id and key of the live features among these ids
  findLiveFeatureKeys(featureIds: number[], prismaTx: PrismaClient) {
    return prismaTx.feature.findMany({
      where: { id: { in: featureIds }, deletedAt: null },
      select: { id: true, featureKey: true }
    })
  }

  createManyRows(
    createData: Prisma.SubscriptionFeatureCreateManyInput[],
    prismaTx: PrismaClient
  ) {
    return prismaTx.subscriptionFeature.createMany({
      data: createData
    })
  }

  listBySubscription(subscriptionId: number, prismaTx: PrismaClient) {
    return prismaTx.subscriptionFeature.findMany({
      where: { subscriptionId, deletedAt: null },
      orderBy: { id: 'asc' }
    })
  }
}
