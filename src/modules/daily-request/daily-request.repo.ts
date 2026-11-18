import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

// conditionType was replaced by dailyRequestCategoryId (foreign key to DailyRequestCategory)
import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateDailyRequestBody,
  DAILY_REQUEST_FIELDS,
  DailyRequest,
  UpdateDailyRequestBody
} from './entities/daily-request.entity'

export type WhereDailyRequestType = {
  id?: number
}

@Injectable()
export class DailyRequestRepo {
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
      data: CreateDailyRequestBody
    },
    prismaTx?: PrismaClient
  ): Promise<DailyRequest> {
    const client = prismaTx || this.prismaService
    return client.dailyRequest.create({
      data: {
        ...data,
        createdById
      }
    })
  }

  update(
    {
      id,
      updatedById,
      data
    }: {
      id: number
      updatedById?: number
      data: UpdateDailyRequestBody
    },
    prismaTx?: PrismaClient
  ): Promise<DailyRequest> {
    const client = prismaTx || this.prismaService
    return client.dailyRequest.update({
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
    {
      id,
      deletedById
    }: {
      id: number
      deletedById: number
    },
    isHard?: boolean,
    prismaTx?: PrismaClient
  ): Promise<DailyRequest> {
    const client = prismaTx || this.prismaService
    return isHard
      ? this.prismaService.dailyRequest.delete({
          where: {
            id
          }
        })
      : this.prismaService.dailyRequest.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date(),
            deletedById
          }
        })
  }

  async list(pagination: PaginationQuery, langId: number) {
    // 1) Parse QS
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, DAILY_REQUEST_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    // 2) Build relational filters for translations directly
    const where: any = { deletedAt: null, ...rawWhere }

    // Accept both 'nameTranslation' and 'nameTranslations' to be flexible
    const nameFilterRaw =
      (rawWhere as any).nameTranslation ?? (rawWhere as any).nameTranslations
    if (nameFilterRaw) {
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
    }

    const descFilterRaw =
      (rawWhere as any).descriptionTranslation ??
      (rawWhere as any).descriptionTranslations
    if (descFilterRaw) {
      const toContainsFilter = (raw: any) => {
        if (typeof raw === 'object' && raw !== null) {
          const val =
            (raw as any).has ?? (raw as any).contains ?? (raw as any).equals ?? raw
          return { contains: String(val), mode: 'insensitive' as const }
        }
        return { contains: String(raw), mode: 'insensitive' as const }
      }
      const searchFilter = toContainsFilter(descFilterRaw)
      delete (where as any).descriptionTranslation
      delete (where as any).descriptionTranslations
      where.descriptionTranslations = {
        some: {
          languageId: langId,
          value: searchFilter
        }
      }
    }

    // 3) Query count + data with include for translations (lang-specific)
    const [totalItems, data] = await Promise.all([
      this.prismaService.dailyRequest.count({ where }),
      this.prismaService.dailyRequest.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          nameTranslations: {
            where: { languageId: langId },
            select: { value: true }
          },
          descriptionTranslations: {
            where: { languageId: langId },
            select: { value: true }
          }
        }
      })
    ])

    // 4) Map to include nameTranslation/descriptionTranslation fields
    const results = data.map((d: any) => {
      const { nameTranslations, descriptionTranslations, ...rest } = d
      return {
        ...rest,
        nameTranslation: nameTranslations?.[0]?.value ?? d.nameKey,
        descriptionTranslation: descriptionTranslations?.[0]?.value ?? d.descriptionKey
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

  async getListwithAllLang(pagination: PaginationQuery, langId?: number) {
    // 1) Parse QS
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, DAILY_REQUEST_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    // 2) Build relational filters for translations directly
    const where: any = { deletedAt: null, ...rawWhere }

    // Accept both 'nameTranslation' and 'nameTranslations' to be flexible
    const nameFilterRaw =
      (rawWhere as any).nameTranslation ?? (rawWhere as any).nameTranslations
    if (nameFilterRaw) {
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
      where.nameTranslations = langId
        ? {
            some: {
              languageId: langId,
              value: searchFilter
            }
          }
        : {
            some: {
              value: searchFilter
            }
          }
    }

    const descFilterRaw =
      (rawWhere as any).descriptionTranslation ??
      (rawWhere as any).descriptionTranslations
    if (descFilterRaw) {
      const toContainsFilter = (raw: any) => {
        if (typeof raw === 'object' && raw !== null) {
          const val =
            (raw as any).has ?? (raw as any).contains ?? (raw as any).equals ?? raw
          return { contains: String(val), mode: 'insensitive' as const }
        }
        return { contains: String(raw), mode: 'insensitive' as const }
      }
      const searchFilter = toContainsFilter(descFilterRaw)
      delete (where as any).descriptionTranslation
      delete (where as any).descriptionTranslations
      where.descriptionTranslations = langId
        ? {
            some: {
              languageId: langId,
              value: searchFilter
            }
          }
        : {
            some: {
              value: searchFilter
            }
          }
    }

    // 3) Query count + data with include for all translations
    const [totalItems, data] = await Promise.all([
      this.prismaService.dailyRequest.count({ where }),
      this.prismaService.dailyRequest.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          nameTranslations: {
            select: { id: true, languageId: true, key: true, value: true }
          },
          descriptionTranslations: {
            select: { id: true, languageId: true, key: true, value: true }
          }
        }
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

  findById(id: number): Promise<DailyRequest | null> {
    return this.prismaService.dailyRequest.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        reward: true,
        nameTranslations: {
          where: {}
        },
        descriptionTranslations: true
      }
    })
  }

  findByIdwithLangId(id: number, langId: number): Promise<DailyRequest | null> {
    return this.prismaService.dailyRequest.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        reward: true,
        nameTranslations: {
          where: {
            languageId: langId
          },
          select: {
            id: true,
            languageId: true,
            value: true
          }
        },
        descriptionTranslations: {
          where: {
            languageId: langId
          },
          select: {
            id: true,
            languageId: true,
            value: true
          }
        }
      }
    })
  }

  findByIdWithAllLang(id: number) {
    return this.prismaService.dailyRequest.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        reward: {
          include: {
            nameTranslations: true
          }
        },
        nameTranslations: true,
        descriptionTranslations: true
      }
    })
  }
  checkDailyRequestIsStreak(id: number): Promise<boolean> {
    // Return true if the daily request has isStreak = true
    return this.prismaService.dailyRequest
      .findUnique({
        where: {
          id,
          deletedAt: null
        },
        select: {
          isStreak: true
        }
      })
      .then((dr) => !!dr?.isStreak)
  }

  findByWhere(where: WhereDailyRequestType): Promise<DailyRequest[]> {
    const prismaWhere: any = {
      deletedAt: null
    }

    if (where.id) prismaWhere.id = where.id

    // no category-based filtering in current schema

    return this.prismaService.dailyRequest.findMany({
      where: prismaWhere,
      include: {
        reward: true
      }
    })
  }

  // category-based queries removed — schema uses isStreak and dailyRequestType fields

  /**
   * Find daily requests by their `dailyRequestType` field (e.g. 'LOGIN', 'EXERCISE')
   */
  findByType(type: string | string[]): Promise<DailyRequest[]> {
    return this.prismaService.dailyRequest.findMany({
      where: {
        deletedAt: null,
        ...(Array.isArray(type)
          ? { dailyRequestType: { in: type as any } }
          : { dailyRequestType: type as any })
      },
      include: {
        reward: true
      }
    })
  }
}
