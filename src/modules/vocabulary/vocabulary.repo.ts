import { VocabularyType } from '@/modules/vocabulary/entities/vocabulary.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { VocabularySortField, VocabularySortOrder } from '@/common/enum/enum'

@Injectable()
export class VocabularyRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: {
    currentPage: number
    pageSize: number
    search?: string
    levelN?: number
    lessonId?: number
    sortBy?: VocabularySortField
    sort?: VocabularySortOrder
  }) {
    const {
      currentPage,
      pageSize,
      search,
      levelN,
      lessonId,
      sortBy = VocabularySortField.CREATED_AT,
      sort = VocabularySortOrder.DESC
    } = params
    const skip = (currentPage - 1) * pageSize

    const where: any = {}

    if (search) {
      where.OR = [
        { wordJp: { contains: search, mode: 'insensitive' } },
        { reading: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (levelN) {
      where.levelN = levelN
    }

    // Nếu có lessonId, loại bỏ vocabulary đã có trong lesson đó
    if (lessonId) {
      const existingContentIds = await this.prismaService.lessonContents.findMany({
        where: {
          lessonId: lessonId,
          contentType: 'VOCABULARY'
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

    const [items, total] = await Promise.all([
      this.prismaService.vocabulary.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sort },
        include: {
          wordType: true
        }
      }),
      this.prismaService.vocabulary.count({ where })
    ])

    return {
      items: items.map((item) => this.transformVocabulary(item)),
      total,
      page: currentPage,
      limit: pageSize
    }
  }

  async findUnique(where: { id?: number }): Promise<VocabularyType | null> {
    if (!where.id) return null

    const result = await this.prismaService.vocabulary.findUnique({
      where: { id: where.id },
      include: {
        wordType: true,
        kanji: {
          include: {
            kanji: {
              select: {
                id: true,
                character: true,
                meaningKey: true
              }
            }
          },
          orderBy: {
            displayOrder: 'asc'
          }
        }
      }
    })
    return result ? this.transformVocabulary(result) : null
  }

  async getKanjiForVocabulary(vocabularyId: number) {
    const vocabularyKanji = await this.prismaService.vocabulary_Kanji.findMany({
      where: { vocabularyId },
      include: {
        kanji: {
          select: {
            id: true,
            character: true,
            meaningKey: true
          }
        }
      },
      orderBy: {
        displayOrder: 'asc'
      }
    })

    return vocabularyKanji.map((vk) => ({
      character: vk.kanji.character,
      meaningKey: vk.kanji.meaningKey,
      displayOrder: vk.displayOrder
    }))
  }

  async findFirst(where: { wordJp: string }): Promise<VocabularyType | null> {
    const result = await this.prismaService.vocabulary.findFirst({
      where,
      include: {
        wordType: true
      }
    })
    return result ? this.transformVocabulary(result) : null
  }

  async create(data: {
    wordJp: string
    reading: string
    imageUrl?: string
    audioUrl?: string
    createdById?: number | null
  }): Promise<VocabularyType> {
    const result = await this.prismaService.vocabulary.create({
      data
    })
    return this.transformVocabulary(result)
  }

  async update(
    where: { id: number },
    data: {
      wordJp?: string
      reading?: string
      imageUrl?: string
      audioUrl?: string
      levelN?: number | null
    }
  ): Promise<VocabularyType> {
    const result = await this.prismaService.vocabulary.update({
      where,
      data
    })
    return this.transformVocabulary(result)
  }

  async delete(where: { id: number }): Promise<VocabularyType> {
    const result = await this.prismaService.vocabulary.delete({
      where
    })
    return this.transformVocabulary(result)
  }

  async count(where?: any): Promise<number> {
    return this.prismaService.vocabulary.count({ where })
  }

  async getStatistics() {
    // Sử dụng 2 queries thay vì 7 queries để giảm số lượng kết nối database
    const [vocabularyStats, totalKanji] = await Promise.all([
      // Query 1: Lấy thống kê vocabulary theo levelN
      this.prismaService.vocabulary.groupBy({
        by: ['levelN'],
        _count: {
          levelN: true
        }
      }),
      // Query 2: Đếm tổng số kanji
      this.prismaService.kanji.count()
    ])

    // Tính tổng vocabulary
    const totalVocabulary = vocabularyStats.reduce(
      (sum, stat) => sum + stat._count.levelN,
      0
    )

    // Khởi tạo object kết quả với giá trị mặc định
    const result = {
      totalVocabulary,
      totalKanji,
      vocabularyN5: 0,
      vocabularyN4: 0,
      vocabularyN3: 0,
      vocabularyN2: 0,
      vocabularyN1: 0
    }

    // Cập nhật số lượng vocabulary theo từng level
    vocabularyStats.forEach((stat) => {
      if (stat.levelN === 5) result.vocabularyN5 = stat._count.levelN
      else if (stat.levelN === 4) result.vocabularyN4 = stat._count.levelN
      else if (stat.levelN === 3) result.vocabularyN3 = stat._count.levelN
      else if (stat.levelN === 2) result.vocabularyN2 = stat._count.levelN
      else if (stat.levelN === 1) result.vocabularyN1 = stat._count.levelN
    })

    return result
  }

  async search(searchKeyword: string, currentPage: number, pageSize: number) {
    // Tối ưu search theo độ ưu tiên:
    // Priority 1: Exact match (wordJp hoặc reading chính xác bằng keyword)
    // Priority 2: Starts with (bắt đầu bằng keyword)
    // Priority 3: Contains (chứa keyword)

    const skip = (currentPage - 1) * pageSize
    const neededCount = skip + pageSize

    // 1. Query exact matches
    const exactMatches = await this.prismaService.vocabulary.findMany({
      where: {
        OR: [
          { wordJp: { equals: searchKeyword, mode: 'insensitive' } },
          { reading: { equals: searchKeyword, mode: 'insensitive' } }
        ]
      },
      include: { meanings: true },
      orderBy: { createdAt: 'desc' }
    })

    const exactIds = exactMatches.map((v) => v.id)
    const exactCount = exactMatches.length

    // 2. Query starts with (loại trừ exact matches đã có)
    // Chỉ fetch đủ để fill page nếu cần
    const neededStartsWith = Math.max(0, neededCount - exactCount)
    const startsWithMatches =
      neededStartsWith > 0
        ? await this.prismaService.vocabulary.findMany({
            where: {
              AND: [
                {
                  OR: [
                    { wordJp: { startsWith: searchKeyword, mode: 'insensitive' } },
                    { reading: { startsWith: searchKeyword, mode: 'insensitive' } }
                  ]
                },
                ...(exactIds.length > 0 ? [{ id: { notIn: exactIds } }] : [])
              ]
            },
            include: { meanings: true },
            orderBy: { createdAt: 'desc' },
            take: neededStartsWith + 10 // Fetch thêm một chút để đảm bảo có đủ
          })
        : []

    const startsWithIds = startsWithMatches.map((v) => v.id)
    const startsWithCount = startsWithMatches.length
    const allExcludedIds = [...exactIds, ...startsWithIds]

    // 3. Query contains (loại trừ exact và starts with đã có)
    // Chỉ fetch đủ để fill page nếu cần
    const neededContains = Math.max(0, neededCount - exactCount - startsWithCount)
    const containsMatches =
      neededContains > 0
        ? await this.prismaService.vocabulary.findMany({
            where: {
              AND: [
                {
                  OR: [
                    { wordJp: { contains: searchKeyword, mode: 'insensitive' } },
                    { reading: { contains: searchKeyword, mode: 'insensitive' } }
                  ]
                },
                ...(allExcludedIds.length > 0 ? [{ id: { notIn: allExcludedIds } }] : [])
              ]
            },
            include: { meanings: true },
            orderBy: { createdAt: 'desc' },
            take: neededContains + 10 // Fetch thêm một chút để đảm bảo có đủ
          })
        : []

    // 4. Combine theo priority
    const allResults = [...exactMatches, ...startsWithMatches, ...containsMatches]

    // 5. Count total (cần count riêng để biết tổng số)
    const [exactTotal, startsWithTotal, containsTotal] = await Promise.all([
      this.prismaService.vocabulary.count({
        where: {
          OR: [
            { wordJp: { equals: searchKeyword, mode: 'insensitive' } },
            { reading: { equals: searchKeyword, mode: 'insensitive' } }
          ]
        }
      }),
      this.prismaService.vocabulary.count({
        where: {
          AND: [
            {
              OR: [
                { wordJp: { startsWith: searchKeyword, mode: 'insensitive' } },
                { reading: { startsWith: searchKeyword, mode: 'insensitive' } }
              ]
            },
            ...(exactIds.length > 0 ? [{ id: { notIn: exactIds } }] : [])
          ]
        }
      }),
      this.prismaService.vocabulary.count({
        where: {
          AND: [
            {
              OR: [
                { wordJp: { contains: searchKeyword, mode: 'insensitive' } },
                { reading: { contains: searchKeyword, mode: 'insensitive' } }
              ]
            },
            ...(allExcludedIds.length > 0 ? [{ id: { notIn: allExcludedIds } }] : [])
          ]
        }
      })
    ])

    const total = exactTotal + startsWithTotal + containsTotal

    // 6. Paginate
    const paginatedResults = allResults.slice(skip, skip + pageSize)

    return {
      items: paginatedResults.map((item) => ({
        id: item.id,
        wordJp: item.wordJp,
        reading: item.reading,
        meanings: item.meanings
      })),
      total,
      page: currentPage,
      limit: pageSize
    }
  }

  async saveSearchHistory(userId: number, searchKeyword: string, vocabularyId?: number) {
    await this.prismaService.vocabularySearchHistory.create({
      data: {
        userId,
        searchKeyword,
        vocabularyId: vocabularyId || null
      }
    })
  }

  async findSearchHistory(userId: number, currentPage: number, pageSize: number) {
    const skip = (currentPage - 1) * pageSize

    const [items, total] = await Promise.all([
      this.prismaService.vocabularySearchHistory.findMany({
        where: { userId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          vocabulary: {
            select: {
              id: true,
              wordJp: true,
              reading: true
            }
          }
        }
      }),
      this.prismaService.vocabularySearchHistory.count({
        where: { userId }
      })
    ])

    return {
      items: items.map((item) => ({
        id: item.id,
        searchKeyword: item.searchKeyword,
        vocabularyId: item.vocabularyId,
        vocabulary: item.vocabulary,
        createdAt: item.createdAt
      })),
      total,
      page: currentPage,
      limit: pageSize
    }
  }

  async findRelatedWords(wordJp: string, excludeId: number, limit: number = 10) {
    // Tìm các từ vựng có chứa wordJp này (loại trừ chính nó)
    const relatedWords = await this.prismaService.vocabulary.findMany({
      where: {
        AND: [
          {
            OR: [
              { wordJp: { contains: wordJp, mode: 'insensitive' } },
              { reading: { contains: wordJp, mode: 'insensitive' } }
            ]
          },
          { id: { not: excludeId } }
        ]
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        meanings: true
      }
    })

    return relatedWords.map((item) => ({
      id: item.id,
      wordJp: item.wordJp,
      reading: item.reading,
      meanings: item.meanings
    }))
  }

  private transformVocabulary(vocabulary: any): VocabularyType {
    return {
      ...vocabulary,
      imageUrl: vocabulary.imageUrl || null,
      audioUrl: vocabulary.audioUrl || null,
      createdById: vocabulary.createdById || null,
      wordType: vocabulary.wordType
        ? {
            id: vocabulary.wordType.id,
            nameKey: vocabulary.wordType.nameKey,
            name: undefined // Will be resolved by service layer
          }
        : null
    }
  }
}
