import { PaginationQuery } from '@/shared/models/request.model'
import { pickNameTranslation } from '@/shared/utils/translation-helper'
import { Injectable } from '@nestjs/common'

import {
  ShopBannerStatus,
  ShopBannerStatusType
} from '@/common/constants/shop-banner.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CreateShopBannerBody, UpdateShopBannerBody } from './dto/shop-banner.zod-dto'
import { REWARD_FIELDS, ShopBanner } from './entities/shop-banner.entity'

type ShopBannerPrismaType = Omit<ShopBanner, 'nameKey'> & { name: string }

@Injectable()
export class ShopBannerRepo {
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
      data: CreateShopBannerBody
    },
    prismaTx?: PrismaClient
  ): Promise<ShopBanner> {
    const client = prismaTx || this.prismaService
    return client.shopBanner.create({
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
      data: UpdateShopBannerBody
    },
    prismaTx?: PrismaClient
  ): Promise<ShopBanner> {
    const client = prismaTx || this.prismaService
    return client.shopBanner.update({
      where: { id, deletedAt: null },
      data: {
        ...data,
        updatedById
      }
    })
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
  ): Promise<ShopBanner> {
    const client = prismaTx || this.prismaService
    const result = isHard
      ? await this.prismaService.shopBanner.delete({
          where: {
            id
          }
        })
      : await client.shopBanner.update({
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

  async list(pagination: PaginationQuery, langId?: number, isAllLang: boolean = false) {
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, REWARD_FIELDS)

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
      this.prismaService.shopBanner.count({ where }),
      this.prismaService.shopBanner.findMany({
        where,
        include: isAllLang
          ? {
              nameTranslations: {
                select: { value: true, languageId: true }
              }
            }
          : langId
            ? {
                nameTranslations: {
                  where: childNameIncludeWhere,
                  select: { value: true }
                }
              }
            : undefined,
        orderBy,
        skip,
        take
      })
    ])

    // Map results to include nameTranslation and exclude nameTranslations array
    const results = data.map((d: any) => {
      const { nameTranslations, ...rest } = d
      const single = pickNameTranslation(nameTranslations, langId, d.nameKey)
      return {
        ...rest,
        ...(isAllLang ? { nameTranslations } : {}),
        nameTranslation: single
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

  async listwithDetail(
    pagination: PaginationQuery,
    langId?: number,
    isAllLang: boolean = false
  ) {
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, REWARD_FIELDS)

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
      this.prismaService.shopBanner.count({ where }),
      this.prismaService.shopBanner.findMany({
        where,
        include: {
          nameTranslations: isAllLang
            ? { select: { value: true, languageId: true } }
            : langId
              ? {
                  where: { languageId: langId },
                  select: { value: true, languageId: true }
                }
              : { select: { value: true, languageId: true } },
          shopItems: {
            where: { deletedAt: null, isActive: true },
            include: {
              pokemon: true
            }
          }
        },
        orderBy,
        skip,
        take
      })
    ])

    // Map results to include nameTranslation and exclude nameTranslations array
    const results = data.map((d: any) => {
      const { nameTranslations, ...rest } = d
      // Find single translation for current langId if provided
      const single = pickNameTranslation(nameTranslations, langId, d.nameKey)
      return {
        ...rest,
        nameTranslations, // keep raw translations for service to format to all languages
        nameTranslation: single
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

  findById(id: number): Promise<ShopBanner | null> {
    return this.prismaService.shopBanner.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findByIdWithDetail(
    id: number,
    langId: number,
    isAllLang: boolean = false
  ): Promise<ShopBanner | null> {
    return this.prismaService.shopBanner.findUnique({
      where: { id, deletedAt: null },
      include: {
        nameTranslations: isAllLang
          ? { select: { value: true, languageId: true } }
          : { where: { languageId: langId }, select: { value: true, languageId: true } },
        shopItems: {
          where: { deletedAt: null, isActive: true },
          include: {
            pokemon: isAllLang
              ? true
              : {
                  select: {
                    pokedex_number: true,
                    nameJp: true,
                    nameTranslations: true,
                    imageUrl: true,
                    rarity: true
                  }
                }
          }
        }
      }
    })
  }

  async findValidByDateWithLangId(
    date: Date,
    langId: number
  ): Promise<ShopBanner | null> {
    const data = await this.prismaService.shopBanner.findFirst({
      where: {
        deletedAt: null,
        status: ShopBannerStatus.ACTIVE,
        AND: [
          {
            OR: [{ startDate: null }, { startDate: { lte: date } }]
          },
          {
            OR: [{ endDate: null }, { endDate: { gte: date } }]
          }
        ]
      },
      include: {
        nameTranslations: {
          where: { languageId: langId },
          select: { value: true }
        },
        shopItems: {
          where: { deletedAt: null, isActive: true },
          include: {
            pokemon: {
              include: {
                previousPokemons: {
                  select: { id: true }
                }
              }
            }
          }
        }
      },
      orderBy: { id: 'asc' }
    })

    if (!data) return null

    return {
      ...data,
      nameTranslation: (data as any).nameTranslations?.[0]?.value ?? data.nameKey
    } as any
  }

  /**
   * Lấy thông tin shop banner để validate
   */
  async findByIdForValidation(shopBannerId: number): Promise<ShopBanner | null> {
    return this.prismaService.shopBanner.findUnique({
      where: { id: shopBannerId },
      select: {
        id: true,
        nameKey: true,
        startDate: true,
        endDate: true,
        status: true,
        enablePrecreate: true,
        precreateBeforeEndDays: true,
        isRandomItemAgain: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        min: true,
        max: true,
        createdById: true,
        deletedById: true,
        updatedById: true
      }
    })
  }

  findByStatus(status: ShopBannerStatusType): Promise<ShopBanner | null> {
    return this.prismaService.shopBanner.findFirst({
      where: {
        status,
        deletedAt: null
      }
    })
  }

  // ---- Daily banner rotation (HandleShopBannerCronjob) ----

  // ACTIVE banners ended before today -> EXPIRED
  expireActiveEndedBefore(now: Date) {
    return this.prismaService.shopBanner.updateMany({
      where: {
        status: ShopBannerStatus.ACTIVE,
        endDate: {
          lt: now
        },
        deletedAt: null
      },
      data: {
        status: ShopBannerStatus.EXPIRED
      }
    })
  }

  // PREVIEW banners whose dates include today, earliest start first
  findPreviewValidOn(now: Date) {
    return this.prismaService.shopBanner.findMany({
      where: {
        status: ShopBannerStatus.PREVIEW,
        deletedAt: null,
        AND: [
          {
            OR: [{ startDate: null }, { startDate: { lte: now } }]
          },
          {
            OR: [{ endDate: null }, { endDate: { gte: now } }]
          }
        ]
      },
      orderBy: {
        startDate: 'asc' // Sort theo startDate tăng dần
      }
    })
  }

  countActive() {
    return this.prismaService.shopBanner.count({
      where: {
        status: ShopBannerStatus.ACTIVE,
        deletedAt: null
      }
    })
  }

  activate(id: number) {
    return this.prismaService.shopBanner.update({
      where: {
        id: id
      },
      data: {
        status: ShopBannerStatus.ACTIVE
      }
    })
  }

  // ACTIVE banners that create their successor, with what is copied
  findActiveWithPrecreate() {
    return this.prismaService.shopBanner.findMany({
      where: {
        status: ShopBannerStatus.ACTIVE,
        enablePrecreate: true,
        deletedAt: null
      },
      include: {
        nameTranslations: true,
        shopItems: {
          include: {
            pokemon: true
          }
        }
      }
    })
  }

  findLiveByNameKeyPrefix(prefix: string) {
    return this.prismaService.shopBanner.findFirst({
      where: {
        nameKey: {
          startsWith: prefix
        },
        deletedAt: null
      }
    })
  }

  createSuccessor(data: Prisma.ShopBannerUncheckedCreateInput) {
    return this.prismaService.shopBanner.create({ data })
  }

  setNameKeyAndTranslations(id: number, nameKey: string, nameUpserts: unknown[]) {
    return this.prismaService.shopBanner.update({
      where: { id: id },
      data: {
        nameKey,
        ...(nameUpserts.length
          ? { nameTranslations: { upsert: nameUpserts as any } }
          : {})
      }
    })
  }

  // The successor exists: never create another one
  disablePrecreate(id: number) {
    return this.prismaService.shopBanner.update({
      where: { id: id },
      data: {
        enablePrecreate: false,
        precreateBeforeEndDays: 999
      }
    })
  }
}
