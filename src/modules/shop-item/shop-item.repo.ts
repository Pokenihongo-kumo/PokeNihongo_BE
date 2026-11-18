import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CreateShopItemBody, UpdateShopItemBody } from './dto/shop-item.zod-dto'
import { SHOP_ITEM_FIELDS, ShopItem } from './entities/shop-item.entity'

@Injectable()
export class ShopItemRepo {
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
      data: CreateShopItemBody
    },
    prismaTx?: PrismaClient
  ): Promise<ShopItem> {
    const client = prismaTx || this.prismaService
    return client.shopItem.create({
      data: {
        ...data,
        createdById
      }
    })
  }

  async createMany(
    {
      createdById,
      items
    }: {
      createdById?: number
      items: CreateShopItemBody[]
    },
    prismaTx?: PrismaClient
  ): Promise<ShopItem[]> {
    const client = prismaTx || this.prismaService
    const createdItems: ShopItem[] = []

    for (const item of items) {
      const created = await client.shopItem.create({
        data: {
          ...item,
          createdById
        }
      })
      createdItems.push(created)
    }

    return createdItems
  }

  update(
    {
      id,
      data,
      updatedById
    }: {
      id: number
      data: UpdateShopItemBody
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<ShopItem> {
    const client = prismaTx || this.prismaService
    return client.shopItem.update({
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

  delete(id: number, isHard?: boolean, prismaTx?: PrismaClient): Promise<ShopItem> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.shopItem.delete({
          where: { id }
        })
      : client.shopItem.update({
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
    const { where, orderBy } = parseQs(pagination.qs, SHOP_ITEM_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.shopItem.count({
        where: filterWhere
      }),
      this.prismaService.shopItem.findMany({
        where: filterWhere,
        include: {
          pokemon: {
            select: {
              id: true,
              pokedex_number: true,
              nameJp: true,
              nameTranslations: true,
              description: true,
              imageUrl: true,
              rarity: true,
              types: {
                select: {
                  id: true,
                  type_name: true,
                  display_name: true,
                  color_hex: true
                }
              }
            }
          },
          shopBanner: true
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

  findById(id: number): Promise<ShopItem | null> {
    return this.prismaService.shopItem.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        pokemon: true,
        shopBanner: true
      }
    })
  }

  incrementPurchasedCount(
    id: number,
    quantity: number,
    prismaTx?: PrismaClient
  ): Promise<ShopItem> {
    const client = prismaTx || this.prismaService
    return client.shopItem.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        purchasedCount: {
          increment: quantity
        }
      }
    })
  }

  /**
   * Đếm số lượng items hiện có trong banner (chưa bị xóa, đang active)
   */
  async countItemsInBanner(shopBannerId: number): Promise<number> {
    return this.prismaService.shopItem.count({
      where: {
        shopBannerId,
        deletedAt: null,
        isActive: true
      }
    })
  }

  /**
   * Kiểm tra pokemonId đã tồn tại trong banner chưa
   */
  async findByBannerAndPokemon(
    shopBannerId: number,
    pokemonId: number,
    excludeId?: number
  ): Promise<ShopItem | null> {
    return this.prismaService.shopItem.findFirst({
      where: {
        shopBannerId,
        pokemonId,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {})
      }
    })
  }

  /**
   * Đếm số lượng shop items của một banner
   */
  async countByShopBannerId(shopBannerId: number): Promise<number> {
    return this.prismaService.shopItem.count({
      where: {
        shopBannerId,
        deletedAt: null,
        isActive: true
      }
    })
  }

  /**
   * Update nhiều items cùng lúc
   */
  async updateMany(
    {
      updatedById,
      items
    }: {
      updatedById?: number
      items: Array<{ id: number } & UpdateShopItemBody>
    },
    prismaTx?: PrismaClient
  ): Promise<ShopItem[]> {
    const client = prismaTx || this.prismaService
    const updatedItems: ShopItem[] = []

    for (const item of items) {
      const { id, ...data } = item
      const updated = await client.shopItem.update({
        where: {
          id,
          deletedAt: null
        },
        data: {
          ...data,
          updatedById
        }
      })
      updatedItems.push(updated)
    }

    return updatedItems
  }
}
