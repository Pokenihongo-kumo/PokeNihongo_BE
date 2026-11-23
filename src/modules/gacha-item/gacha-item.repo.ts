import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { GachaItem, Prisma, PrismaClient } from '@prisma/client'
import { PrismaService } from '@/shared/services/prisma.service'
import { GACHA_ITEM_FIELDS } from './entities/gacha-item.entity'

@Injectable()
export class GachaItemRepo {
  constructor(private readonly prismaService: PrismaService) {}

  // Wrapper for transaction
  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }

  async getListPokemonWithGachaBannerId(bannerId: number, pagination: any) {
    const { where: rawWhere = {}, orderBy } = parseQs(
      pagination.qs,
      [
        'id',
        'pokedex_number',
        'nameJp',
        'nameTranslations',
        'imageUrl',
        'rarity',
        'types',
        'nameTranslations.vi',
        'nameTranslations.en',
        'nameTranslations.ja'
      ],
      ['types', 'rarities'],
      []
    )

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    // Build base where for pokemon query
    const where: any = { deletedAt: null, ...rawWhere }

    // Fetch banner items to exclude their pokemon ids
    const banner = await this.prismaService.gachaBanner.findUnique({
      where: { id: bannerId, deletedAt: null },
      include: { items: { select: { pokemonId: true } } }
    })

    const excludeIds = (banner?.items || []).map((i: any) => i.pokemonId)
    if (excludeIds.length > 0) where.id = { notIn: excludeIds }

    const [totalItems, data] = await Promise.all([
      this.prismaService.pokemon.count({ where }),
      this.prismaService.pokemon.findMany({
        where,
        select: {
          id: true,
          pokedex_number: true,
          nameJp: true,
          nameTranslations: true,
          imageUrl: true,
          rarity: true
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

  async create({
    createdById,
    data
  }: {
    createdById: number
    data: Prisma.GachaItemCreateInput
  }): Promise<GachaItem> {
    return this.prismaService.gachaItem.create({
      data: {
        ...data,
        createdBy: { connect: { id: createdById } }
      }
    })
  }

  async createMany({
    createdById,
    items
  }: {
    createdById: number
    items: Array<{
      bannerId: number
      pokemonId: number
      gachaItemRateId: number
    }>
  }): Promise<GachaItem[]> {
    // Sử dụng createMany để giảm số lượng queries
    await this.prismaService.gachaItem.createMany({
      data: items.map((item) => ({
        bannerId: item.bannerId,
        pokemonId: item.pokemonId,
        gachaItemRateId: item.gachaItemRateId,
        createdById
      })),
      skipDuplicates: false
    })

    // Fetch lại items vừa tạo để return
    const createdItems = await this.prismaService.gachaItem.findMany({
      where: {
        bannerId: items[0].bannerId,
        pokemonId: { in: items.map((item) => item.pokemonId) }
      },
      orderBy: { createdAt: 'desc' },
      take: items.length
    })

    return createdItems
  }

  async update({
    id,
    data,
    updatedById
  }: {
    id: number
    data: Prisma.GachaItemUpdateInput
    updatedById?: number
  }): Promise<GachaItem> {
    return this.prismaService.gachaItem.update({
      where: { id },
      data: {
        ...data,
        ...(updatedById ? { updatedBy: { connect: { id: updatedById } } } : {})
      }
    })
  }

  async updateMany({
    updatedById,
    items
  }: {
    updatedById: number
    items: Array<{ id: number; pokemonId?: number; gachaItemRateId?: number }>
  }): Promise<GachaItem[]> {
    return Promise.all(
      items.map((item) =>
        this.prismaService.gachaItem.update({
          where: { id: item.id },
          data: {
            ...(item.pokemonId ? { pokemon: { connect: { id: item.pokemonId } } } : {}),
            ...(item.gachaItemRateId
              ? { gachaItemRate: { connect: { id: item.gachaItemRateId } } }
              : {}),
            updatedBy: { connect: { id: updatedById } }
          }
        })
      )
    )
  }

  async delete(id: number): Promise<GachaItem> {
    return this.prismaService.gachaItem.delete({
      where: { id }
    })
  }

  async findById(id: number): Promise<GachaItem | null> {
    return this.prismaService.gachaItem.findFirst({
      where: { id, deletedAt: null },
      include: {
        pokemon: {
          select: {
            id: true,
            nameJp: true,
            nameTranslations: true,
            imageUrl: true,
            rarity: true
          }
        },
        gachaItemRate: {
          select: {
            id: true,
            starType: true,
            rate: true
          }
        }
      }
    })
  }

  async findByBannerAndPokemon(
    bannerId: number,
    pokemonId: number,
    excludeId?: number
  ): Promise<GachaItem | null> {
    return this.prismaService.gachaItem.findFirst({
      where: {
        bannerId,
        pokemonId,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {})
      }
    })
  }

  async countItemsInBanner(bannerId: number): Promise<number> {
    return this.prismaService.gachaItem.count({
      where: { bannerId, deletedAt: null }
    })
  }

  async countItemsByStarType(bannerId: number, starType: string): Promise<number> {
    return this.prismaService.gachaItem.count({
      where: {
        bannerId,
        deletedAt: null,
        gachaItemRate: {
          starType: starType as any
        }
      }
    })
  }

  async list(pagination: PaginationQuery) {
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, [
      ...GACHA_ITEM_FIELDS
    ])

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const where: Prisma.GachaItemWhereInput = {
      deletedAt: null,
      ...rawWhere
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.gachaItem.count({ where }),
      this.prismaService.gachaItem.findMany({
        where,
        include: {
          pokemon: {
            select: {
              id: true,
              nameJp: true,
              nameTranslations: true,
              imageUrl: true,
              rarity: true
            }
          },
          gachaItemRate: {
            select: {
              id: true,
              starType: true,
              rate: true
            }
          }
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

  async getListItemsByBannerId(bannerId: number, pagination: PaginationQuery) {
    // const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, [
    //   ...GACHA_ITEM_FIELDS
    // ])

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const where: Prisma.GachaItemWhereInput = {
      deletedAt: null,
      // ...rawWhere,
      bannerId
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.gachaItem.count({ where }),
      this.prismaService.gachaItem.findMany({
        where,
        include: {
          pokemon: {
            select: {
              id: true,
              nameJp: true,
              nameTranslations: true,
              imageUrl: true,
              rarity: true
            }
          },
          gachaItemRate: {
            select: {
              id: true,
              starType: true,
              rate: true
            }
          }
        },
        orderBy: {
          gachaItemRate: { starType: 'desc' }
        },
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

  /**
   * Update all items for a banner in a transaction
   * Deletes old items and creates new ones
   */
  async updateManyByBanner({
    bannerId,
    updatedById,
    items
  }: {
    bannerId: number
    updatedById: number
    items: Array<{
      bannerId: number
      pokemonId: number
      gachaItemRateId: number
    }>
  }): Promise<GachaItem[]> {
    return await this.prismaService.$transaction(async (prismaTx) => {
      // Delete old items
      await prismaTx.gachaItem.deleteMany({ where: { bannerId } })

      // Create new items
      if (items.length > 0) {
        await prismaTx.gachaItem.createMany({
          data: items.map((item) => ({
            bannerId: item.bannerId,
            pokemonId: item.pokemonId,
            gachaItemRateId: item.gachaItemRateId,
            createdById: updatedById
          }))
        })
      }

      // Fetch created items to return
      const created = await prismaTx.gachaItem.findMany({
        where: {
          bannerId,
          pokemonId: { in: items.map((item) => item.pokemonId) }
        },
        include: {
          pokemon: {
            select: {
              id: true,
              nameJp: true,
              nameTranslations: true,
              imageUrl: true,
              rarity: true
            }
          },
          gachaItemRate: {
            select: {
              id: true,
              starType: true,
              rate: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return created
    })
  }

  // ---- Replacing a banner's items (updateByList, one transaction) ----

  deleteByBanner(bannerId: number, prismaTx: PrismaClient) {
    return prismaTx.gachaItem.deleteMany({
      where: { bannerId }
    })
  }

  createManyForBanner(
    itemsToCreate: { bannerId: number; pokemonId: number; gachaItemRateId: number }[],
    updatedById: number,
    prismaTx: PrismaClient
  ) {
    return prismaTx.gachaItem.createMany({
      data: itemsToCreate.map((item) => ({
        bannerId: item.bannerId,
        pokemonId: item.pokemonId,
        gachaItemRateId: item.gachaItemRateId,
        createdById: updatedById,
        updatedById
      }))
    })
  }

  // The items just created, with pokemon and rate for the response
  findCreatedForBanner(bannerId: number, pokemonIds: number[], prismaTx: PrismaClient) {
    return prismaTx.gachaItem.findMany({
      where: {
        bannerId,
        pokemonId: { in: pokemonIds }
      },
      include: {
        pokemon: {
          select: {
            id: true,
            nameJp: true,
            nameTranslations: true,
            imageUrl: true,
            rarity: true
          }
        },
        gachaItemRate: {
          select: {
            id: true,
            starType: true,
            rate: true
          }
        }
      }
    })
  }
}
