import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CreateTranslationBodyType } from '../translation/entities/translation.entity'
import {
  CreateDebuffRoundBodyType,
  DEBUFF_FIELDS,
  DebuffRoundType,
  UpdateDebuffRoundBodyType
} from './entities/debuff-round.entity'

@Injectable()
export class DebuffRoundRepo {
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
      data: CreateDebuffRoundBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<DebuffRoundType> {
    const client = prismaTx || this.prismaService
    return client.debuffRound.create({
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
      data: UpdateDebuffRoundBodyType & {
        nameTranslations: CreateTranslationBodyType[]
        debuffRoundNameKey: string
      }
    },
    prismaTx?: PrismaClient
  ): Promise<DebuffRoundType> {
    const client = prismaTx || this.prismaService
    const { nameTranslations, debuffRoundNameKey, ...debuffRoundData } = data

    const updatedDebuffRound = await client.debuffRound.update({
      where: { id, deletedAt: null },
      data: {
        ...debuffRoundData,
        updatedById
      }
    })

    // Upsert translations riêng
    await Promise.all(
      nameTranslations.map((tr) =>
        client.translation.upsert({
          where: {
            languageId_key: {
              languageId: tr.languageId,
              key: debuffRoundNameKey
            }
          },
          create: {
            languageId: tr.languageId,
            key: debuffRoundNameKey,
            value: tr.value,
            debuffRoundNameKey
          },
          update: {
            value: tr.value
          }
        })
      )
    )

    return updatedDebuffRound
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
  ): Promise<DebuffRoundType> {
    const client = prismaTx || this.prismaService
    const result = isHard
      ? await this.prismaService.debuffRound.delete({
          where: {
            id
          }
        })
      : await client.debuffRound.update({
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

  async list(pagination: PaginationQueryType, langId?: number, isAdmin: boolean = false) {
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, DEBUFF_FIELDS)

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
      this.prismaService.debuffRound.count({ where }),
      this.prismaService.debuffRound.findMany({
        where,
        include: {
          // Always include all translations with languageId for service-level mapping
          nameTranslations: {
            select: { value: true, languageId: true }
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
      const single = langId
        ? (nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
          d.nameKey)
        : undefined
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
  findById(id: number): Promise<DebuffRoundType | null> {
    return this.prismaService.debuffRound.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findByIdWithLangId(
    id: number,
    isAllLang: boolean,
    langId: number
  ): Promise<DebuffRoundType | null> {
    return this.prismaService.debuffRound.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        nameTranslations: isAllLang
          ? { select: { value: true, languageId: true } }
          : { where: { languageId: langId }, select: { value: true, languageId: true } }
      }
    })
  }
}
