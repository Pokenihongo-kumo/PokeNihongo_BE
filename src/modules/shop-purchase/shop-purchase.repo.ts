import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateShopPurchaseBody,
  SHOP_PURCHASE_FIELDS,
  ShopPurchase,
  UpdateShopPurchaseBody
} from './entities/shop-purchase.entity'

@Injectable()
export class ShopPurchaseRepo {
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
      data: CreateShopPurchaseBody & {
        totalPrice: number
        userId: number
        walletTransId: number | null
      }
    },
    prismaTx?: PrismaClient
  ): Promise<ShopPurchase> {
    const client = prismaTx || this.prismaService
    return client.shopPurchase.create({
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
      data: UpdateShopPurchaseBody & { walletTransId?: number | null }
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<ShopPurchase> {
    const client = prismaTx || this.prismaService
    return client.shopPurchase.update({
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

  delete(id: number, isHard?: boolean, prismaTx?: PrismaClient): Promise<ShopPurchase> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.shopPurchase.delete({
          where: { id }
        })
      : client.shopPurchase.update({
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
      this.prismaService.shopPurchase.count({
        where: filterWhere
      }),
      this.prismaService.shopPurchase.findMany({
        where: filterWhere,
        include: {
          shopItem: true,
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

  findById(id: number): Promise<ShopPurchase | null> {
    return this.prismaService.shopPurchase.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        shopItem: true,
        walletTrans: true
      }
    })
  }

  findByUserId(userId: number): Promise<ShopPurchase[]> {
    return this.prismaService.shopPurchase.findMany({
      where: {
        userId,
        deletedAt: null
      },
      include: {
        shopItem: true,
        walletTrans: true
      }
    })
  }

  // Tính tổng số lượng user đã mua cho 1 shop item cụ thể
  async getTotalPurchasedQuantityByUserAndItem(
    userId: number,
    shopItemId: number
  ): Promise<number> {
    const purchases = await this.prismaService.shopPurchase.findMany({
      where: {
        userId,
        shopItemId,
        deletedAt: null
      },
      select: {
        quantity: true
      }
    })

    return purchases.reduce((total, purchase) => total + purchase.quantity, 0)
  }
}
