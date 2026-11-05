import { SortOrder, TranslationSortField } from '@/common/enum/enum'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import {
  DuplicateLanguageException,
  DuplicateRecordException,
  DuplicateValueException
} from './dto/translation.error'
import {
  CreateTranslationBodyType,
  TranslationType,
  UpdateTranslationBodyType
} from './entities/translation.entities'

@Injectable()
export class TranslationRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: {
    page: number
    limit: number
    search?: string
    languageId?: number
    key?: string
    sortBy?: TranslationSortField
    sort?: SortOrder
  }) {
    const {
      page,
      limit,
      search,
      languageId,
      key,
      sortBy = TranslationSortField.CREATED_AT,
      sort = SortOrder.DESC
    } = params
    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { key: { contains: search, mode: 'insensitive' } },
        { value: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (languageId) {
      where.languageId = languageId
    }

    if (key) {
      where.key = { contains: key, mode: 'insensitive' }
    }

    const [data, total] = await Promise.all([
      this.prismaService.translation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sort }
      }),
      this.prismaService.translation.count({ where })
    ])

    return {
      data: data.map((item) => this.transformTranslation(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async findById(id: number): Promise<TranslationType | null> {
    const translation = await this.prismaService.translation.findUnique({
      where: { id }
    })

    if (!translation) {
      return null
    }

    return this.transformTranslation(translation)
  }

  async findByKeyAndLanguage(
    key: string,
    languageId: number
  ): Promise<TranslationType | null> {
    const translation = await this.prismaService.translation.findUnique({
      where: {
        languageId_key: {
          languageId,
          key
        }
      }
    })

    if (!translation) {
      return null
    }

    return this.transformTranslation(translation)
  }

  async findByKey(key: string) {
    const translations = await this.prismaService.translation.findMany({
      where: { key },
      orderBy: { languageId: 'asc' }
    })

    return translations.map((item) => this.transformTranslation(item))
  }

  async findByLanguage(
    languageId: number,
    params: {
      page: number
      limit: number
    }
  ) {
    const { page, limit } = params
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      this.prismaService.translation.findMany({
        where: { languageId },
        skip,
        take: limit,
        orderBy: { key: 'asc' }
      }),
      this.prismaService.translation.count({
        where: { languageId }
      })
    ])

    return {
      data: data.map((item) => this.transformTranslation(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async create(data: CreateTranslationBodyType): Promise<TranslationType> {
    const result = await this.prismaService.translation.create({
      data: {
        languageId: data.languageId,
        key: data.key,
        value: data.value
      }
    })

    return this.transformTranslation(result)
  }

  async createMany(data: CreateTranslationBodyType[]): Promise<{ count: number }> {
    return await this.prismaService.translation.createMany({
      data: data.map((item) => ({
        languageId: item.languageId,
        key: item.key,
        value: item.value
      }))
    })
  }

  async update(id: number, data: UpdateTranslationBodyType): Promise<TranslationType> {
    const result = await this.prismaService.translation.update({
      where: { id },
      data: {
        ...(data.languageId && { languageId: data.languageId }),
        ...(data.key && { key: data.key }),
        ...(data.value && { value: data.value })
      }
    })

    return this.transformTranslation(result)
  }

  async updateByKeyAndLanguage(
    key: string,
    languageId: number,
    data: UpdateTranslationBodyType
  ): Promise<TranslationType> {
    const result = await this.prismaService.translation.update({
      where: {
        languageId_key: {
          languageId,
          key
        }
      },
      data: {
        ...(data.languageId && { languageId: data.languageId }),
        ...(data.key && { key: data.key }),
        ...(data.value && { value: data.value })
      }
    })

    return this.transformTranslation(result)
  }

  async delete(id: number): Promise<void> {
    await this.prismaService.translation.delete({
      where: { id }
    })
  }

  async deleteByKeyAndLanguage(key: string, languageId: number): Promise<void> {
    await this.prismaService.translation.delete({
      where: {
        languageId_key: {
          languageId,
          key
        }
      }
    })
  }

  async deleteByKey(key: string, prismaTx?: PrismaClient): Promise<{ count: number }> {
    const client = prismaTx || this.prismaService
    return await client.translation.deleteMany({
      where: { key }
    })
  }

  async count(where?: any): Promise<number> {
    return this.prismaService.translation.count({ where })
  }

  /**
   * Validate translation records để kiểm tra duplicate values
   * @param translationRecords - Danh sách translation records cần validate
   * @throws Error nếu có value trùng lặp
   */
  async validateTranslationRecords(
    translationRecords: CreateTranslationBodyType[]
  ): Promise<void> {
    const languageIdSet = new Set<number>()

    // check langueageId duplicate
    for (const record of translationRecords) {
      if (languageIdSet.has(record.languageId)) {
        throw new DuplicateLanguageException()
      }
      languageIdSet.add(record.languageId)
    }

    // Check duplicate values trong input array
    const valueMap = new Map<string, { languageId: number; key: string }>()

    for (const record of translationRecords) {
      const normalizedValue = record.value.trim().toLowerCase()

      if (valueMap.has(normalizedValue)) {
        throw new DuplicateValueException() // duplicate trong input array
      }

      valueMap.set(normalizedValue, {
        languageId: record.languageId,
        key: record.key
      })
    }

    // Check duplicate values với database
    const values = translationRecords.map((r) => r.value.trim())

    const existingTranslations = await this.prismaService.translation.findMany({
      where: {
        value: {
          in: values,
          mode: 'insensitive'
        }
      },
      select: {
        languageId: true,
        key: true,
        value: true
      }
    })

    // Check conflicts với existing records
    for (const existing of existingTranslations) {
      const conflictRecord = translationRecords.find((r) => {
        // value must match (case-insensitive) and language must be the same
        if (r.value.trim().toLowerCase() !== existing.value.toLowerCase()) return false
        if (r.languageId !== existing.languageId) return false

        // if exact same key -> it's the same translation record, allow
        if (r.key === existing.key) return false

        // try to parse keys as table.field.id
        const parse = (k: string) => {
          const parts = k.split('.')
          if (parts.length < 3) return null
          const table = parts[0]
          const field = parts[1]
          const id = parts.slice(2).join('.') // allow ids with dots, but last part(s)
          return { table, field, id }
        }

        const a = parse(r.key)
        const b = parse(existing.key)

        // If both parsed successfully, conflict only when same table+field but different id
        if (a && b) {
          if (a.table === b.table && a.field === b.field && a.id !== b.id) return true
          return false
        }

        // If parsing failed for either key, fallback: do not treat as conflict unless keys are exactly equal (already handled)
        return false
      })

      if (conflictRecord) {
        console.log(existing)

        throw new DuplicateRecordException() // conflict với database
      }
    }

    // toi day la tất cả ok
  }

  /**
   * Create or Update translation record
   * @param data - Translation data
   * @returns Created or updated translation
   */

  async createOrUpdateWithTransaction(
    data: { languageId: number; key: string; value: string },
    prismaTx?: PrismaClient // optional, nếu có thì dùng transaction
  ): Promise<TranslationType> {
    const client = prismaTx || this.prismaService

    const existingTranslation = await client.translation.findUnique({
      where: {
        languageId_key: {
          languageId: data.languageId,
          key: data.key
        }
      }
    })

    if (existingTranslation) {
      const updated = await client.translation.update({
        where: {
          languageId_key: {
            languageId: data.languageId,
            key: data.key
          }
        },
        data: {
          value: data.value,
          updatedAt: new Date()
        }
      })
      return this.transformTranslation(updated)
    } else {
      const created = await client.translation.create({
        data: {
          languageId: data.languageId,
          key: data.key,
          value: data.value
        }
      })
      return this.transformTranslation(created)
    }
  }

  findByLangAndKey(langId: number, key: string): Promise<TranslationType | null> {
    //! schema đang thiếu deletedAt
    return this.prismaService.translation.findFirst({
      where: { languageId: langId, key }
    })
  }

  // Lấy nhiều translations theo keys và languageId
  async findByKeysAndLanguage(
    keys: string[],
    languageId: number
  ): Promise<TranslationType[]> {
    if (keys.length === 0) return []

    return this.prismaService.translation.findMany({
      where: {
        key: {
          in: keys
        },
        languageId
      }
    })
  }

  async findByKeyOrMeaningPrefix(
    key: string,
    languageId: number
  ): Promise<TranslationType[]> {
    const translations = await this.prismaService.translation.findMany({
      where: {
        languageId,
        OR: [
          { key },
          {
            key: {
              startsWith: `${key}.meaning.`
            }
          }
        ]
      }
    })

    return translations.map((item) => this.transformTranslation(item))
  }

  private transformTranslation(translation: any): TranslationType {
    return {
      ...translation
    }
  }
}
