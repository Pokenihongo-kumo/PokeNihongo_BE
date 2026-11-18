import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateGachaPurchaseBody,
  GachaPurchase,
  SHOP_PURCHASE_FIELDS,
  UpdateGachaPurchaseBody
} from './entities/gacha-purchase.entity'

@Injectable()
export class GachaPurchaseRepo {
  constructor(private prismaService: PrismaService) {}
  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }
  create(
    {
      createdById,
      data
    }: {
      createdById?: number
      data: CreateGachaPurchaseBody & {
        totalCost: number
        userId: number
        walletTransId: number | null
      }
    },
    prismaTx?: PrismaClient
  ): Promise<GachaPurchase> {
    const client = prismaTx || this.prismaService
    return client.gachaPurchase.create({
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
      data: UpdateGachaPurchaseBody & { walletTransId?: number | null }
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<GachaPurchase> {
    const client = prismaTx || this.prismaService
    return client.gachaPurchase.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...data,
        updatedById
      }
    })
  }

  delete(id: number, isHard?: boolean, prismaTx?: PrismaClient): Promise<GachaPurchase> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.gachaPurchase.delete({
          where: { id }
        })
      : client.gachaPurchase.update({
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
    const { where, orderBy } = parseQs(pagination.qs, SHOP_PURCHASE_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.gachaPurchase.count({
        where: filterWhere
      }),
      this.prismaService.gachaPurchase.findMany({
        where: filterWhere,
        include: {
          walletTrans: true,
          user: true
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

  findById(id: number): Promise<GachaPurchase | null> {
    return this.prismaService.gachaPurchase.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        walletTrans: true
      }
    })
  }

  findByUserId(userId: number): Promise<GachaPurchase[]> {
    return this.prismaService.gachaPurchase.findMany({
      where: {
        userId,
        deletedAt: null
      },
      include: {
        walletTrans: true
      }
    })
  }
}
