import { GrammarSortField, SortOrder } from '@/common/enum/enum'
import { PrismaService } from '@/shared/services/prisma.service'
import { toSkipTake } from '@/shared/utils/pagination'
import { Injectable } from '@nestjs/common'
import { Grammar, GrammarUsage, Prisma } from '@prisma/client'
import {
  CreateGrammarBasicBodyType,
  CreateGrammarBodyType,
  GetGrammarListQueryType,
  UpdateGrammarBodyType
} from './entities/grammar.entity'

@Injectable()
export class GrammarRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(
    params: GetGrammarListQueryType
  ): Promise<{ data: Grammar[]; total: number }> {
    const {
      currentPage,
      pageSize,
      level,
      search,
      lessonId,
      sortBy = GrammarSortField.CREATED_AT,
      sort = SortOrder.DESC
    } = params

    const where: Prisma.GrammarWhereInput = {}

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
        ...toSkipTake(currentPage, pageSize)
      }),
      this.prismaService.grammar.count({ where })
    ])

    return { data, total }
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
      {} as Record<string, typeof translations>
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

  create(data: CreateGrammarBasicBodyType): Promise<Grammar> {
    return this.prismaService.grammar.create({
      data: { structure: data.structure, level: data.level }
    })
  }

  /**
   * Grammar, its optional first usage and that usage's translations in one
   * transaction (moved here from GrammarService, unchanged). The usage keys
   * embed the usage id, so the usage is created first and its keys updated.
   */
  async createWithUsage(data: CreateGrammarBodyType): Promise<{
    grammar: Grammar
    grammarUsage: GrammarUsage | null
    translationsCreated: number
  }> {
    return this.prismaService.$transaction(async (tx) => {
      const grammar = await tx.grammar.create({
        data: { structure: data.structure, level: data.level }
      })

      let grammarUsage: GrammarUsage | null = null
      let translationsCreated = 0

      if (data.usage) {
        const tempId = Date.now()
        const created = await tx.grammarUsage.create({
          data: {
            grammarId: grammar.id,
            explanationKey: `grammar.${grammar.id}.usage.${tempId}.explanation`,
            exampleSentenceJp: data.usage.exampleSentenceJp,
            exampleSentenceKey: `grammar.${grammar.id}.usage.${tempId}.example`
          }
        })
        grammarUsage = await tx.grammarUsage.update({
          where: { id: created.id },
          data: {
            explanationKey: `grammar.${grammar.id}.usage.${created.id}.explanation`,
            exampleSentenceKey: `grammar.${grammar.id}.usage.${created.id}.example`
          }
        })
      }

      if (grammarUsage && data.translations?.usage) {
        const languages = await tx.languages.findMany()
        const languageIdByCode = new Map(languages.map((l) => [l.code, l.id]))
        const usage = grammarUsage
        const rows = data.translations.usage.flatMap((t) => {
          const languageId = languageIdByCode.get(t.language_code)
          if (!languageId) return []
          return [
            { key: usage.explanationKey, value: t.explanation, languageId },
            { key: usage.exampleSentenceKey, value: t.example, languageId }
          ]
        })
        if (rows.length > 0) {
          const result = await tx.translation.createMany({
            data: rows,
            skipDuplicates: true
          })
          translationsCreated = result.count
        }
      }

      return { grammar, grammarUsage, translationsCreated }
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
    const count = await this.prismaService.grammar.count({
      where: { structure, ...(excludeId && { id: { not: excludeId } }) }
    })
    return count > 0
  }
}
