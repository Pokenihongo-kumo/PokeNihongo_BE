import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  CreateGrammarBodyType,
  UpdateGrammarBodyType,
  GetGrammarListQueryType
} from './entities/grammar.entity'
import { GrammarSortField, SortOrder } from '@/common/enum/enum'

@Injectable()
export class GrammarRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: GetGrammarListQueryType) {
    const {
      currentPage,
      pageSize,
      level,
      search,
      lessonId,
      sortBy = GrammarSortField.CREATED_AT,
      sort = SortOrder.DESC
    } = params
    const skip = (currentPage - 1) * pageSize

    const where: any = {}

    if (level) {
      where.level = level
    }

    if (search) {
      where.structure = {
        contains: search,
        mode: 'insensitive'
      }
    }

    // Nếu có lessonId, loại bỏ grammar đã có trong lesson đó
    if (lessonId) {
      const existingContentIds = await this.prismaService.lessonContents.findMany({
        where: {
          lessonId: lessonId,
          contentType: 'GRAMMAR'
        },
        select: {
          contentId: true
        }
      })

      const excludedIds = existingContentIds.map((item) => item.contentId)
      if (excludedIds.length > 0) {
        where.id = {
          notIn: excludedIds
        }
      }
    }

    const [data, total] = await Promise.all([
      this.prismaService.grammar.findMany({
        where,
        orderBy: { [sortBy]: sort },
        skip,
        take: pageSize
      }),
      this.prismaService.grammar.count({ where })
    ])

    return {
      data,
      total,
      current: currentPage,
      pageSize: pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }

  async findById(id: number) {
    return this.prismaService.grammar.findUnique({
      where: { id },
      include: {
        usages: {
          include: {
            grammar: true
          }
        }
      }
    })
  }

  async findByIdWithTranslations(id: number) {
    const grammar = await this.prismaService.grammar.findUnique({
      where: { id },
      include: {
        usages: {
          include: {
            grammar: true
          }
        }
      }
    })

    if (!grammar) {
      return null
    }

    // Get translations for all usage keys
    const usageKeys = grammar.usages.flatMap((usage) => [
      usage.explanationKey,
      usage.exampleSentenceKey
    ])

    const translations = await this.prismaService.translation.findMany({
      where: {
        key: {
          in: usageKeys
        }
      },
      include: {
        language: true
      }
    })

    // Group translations by key
    const translationsByKey = translations.reduce(
      (acc, translation) => {
        if (!acc[translation.key]) {
          acc[translation.key] = []
        }
        acc[translation.key].push(translation)
        return acc
      },
      {} as Record<string, any[]>
    )

    // Add translations to usages
    const usagesWithTranslations = grammar.usages.map((usage) => ({
      ...usage,
      explanationTranslations: (translationsByKey[usage.explanationKey] || []).map(
        (t) => ({
          language_code: t.language.code,
          value: t.value
        })
      ),
      exampleTranslations: (translationsByKey[usage.exampleSentenceKey] || []).map(
        (t) => ({
          language_code: t.language.code,
          value: t.value
        })
      )
    }))

    return {
      ...grammar,
      usages: usagesWithTranslations
    }
  }

  async create(data: CreateGrammarBodyType) {
    return this.prismaService.grammar.create({
      data
    })
  }

  async update(id: number, data: UpdateGrammarBodyType) {
    return this.prismaService.grammar.update({
      where: { id },
      data
    })
  }

  async delete(id: number) {
    return this.prismaService.grammar.delete({
      where: { id }
    })
  }

  // Helper methods
  async checkGrammarExists(id: number) {
    const count = await this.prismaService.grammar.count({
      where: { id }
    })
    return count > 0
  }

  async checkStructureExists(structure: string, excludeId?: number) {
    const where: any = { structure }
    if (excludeId) {
      where.id = { not: excludeId }
    }

    const count = await this.prismaService.grammar.count({ where })
    return count > 0
  }
}
