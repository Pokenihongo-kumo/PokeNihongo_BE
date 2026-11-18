import { RarityPokemonType } from '@/common/constants/pokemon.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateShopRarityPriceBody,
  SHOP_RARITY_PRICE_FIELDS,
  ShopRarityPrice,
  UpdateShopRarityPriceBody
} from './entities/shop-rarity-price.entity'

@Injectable()
export class ShopRarityPriceRepo {
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
      data: CreateShopRarityPriceBody
    },
    prismaTx?: PrismaClient
  ): Promise<ShopRarityPrice> {
    const client = prismaTx || this.prismaService
    return client.shopRarityPrice.create({
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
      data: UpdateShopRarityPriceBody
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<ShopRarityPrice> {
    const client = prismaTx || this.prismaService
    return client.shopRarityPrice.update({
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

  delete(
    id: number,
    isHard?: boolean,
    prismaTx?: PrismaClient
  ): Promise<ShopRarityPrice> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.shopRarityPrice.delete({
          where: { id }
        })
      : client.shopRarityPrice.update({
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
    const { where, orderBy } = parseQs(pagination.qs, SHOP_RARITY_PRICE_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.shopRarityPrice.count({
        where: filterWhere
      }),
      this.prismaService.shopRarityPrice.findMany({
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

  findById(id: number): Promise<ShopRarityPrice | null> {
    return this.prismaService.shopRarityPrice.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  getByType(rarity: RarityPokemonType): Promise<ShopRarityPrice | null> {
    return this.prismaService.shopRarityPrice.findFirst({
      where: {
        rarity,
        deletedAt: null
      }
    })
  }
}
