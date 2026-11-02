import {
  Kanji,
  CreateKanjiBodyType,
  UpdateKanjiBodyType
} from './entities/kanji.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { KanjiSortField, SortOrder } from '@/common/enum/enum'

@Injectable()
export class KanjiRepository {
  constructor(private readonly prismaService: PrismaService) {}

  // Kanji CRUD operations
  async findMany(params: {
    currentPage: number
    pageSize: number
    search?: string
    jlptLevel?: number
    strokeCount?: number
    lessonId?: number
    sortBy?: KanjiSortField
    sortOrder?: SortOrder
  }) {
    const {
      currentPage,
      pageSize,
      search,
      jlptLevel,
      strokeCount,
      lessonId,
      sortBy = KanjiSortField.CREATED_AT,
      sortOrder = SortOrder.DESC
    } = params
    const skip = (currentPage - 1) * pageSize

    const where: any = {}

    if (search) {
      where.OR = [
        { character: { contains: search, mode: 'insensitive' } },
        { meaningKey: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (jlptLevel) {
      where.jlptLevel = jlptLevel
    }

    if (strokeCount) {
      where.strokeCount = strokeCount
    }

    // Nếu có lessonId, loại bỏ kanji đã có trong lesson đó
    if (lessonId) {
      const existingContentIds = await this.prismaService.lessonContents.findMany({
        where: {
          lessonId: lessonId,
          contentType: 'KANJI'
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

    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const [data, total] = await Promise.all([
      this.prismaService.kanji.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          readings: {
            select: {
              id: true,
              kanjiId: true,
              readingType: true,
              reading: true,
              createdAt: true,
              updatedAt: true
            }
          },
          _count: {
            select: {
              vocabularies: true,
              readings: true
            }
          }
        }
      }),
      this.prismaService.kanji.count({ where })
    ])

    return {
      data: data.map((item) => this.transformKanji(item)),
      total,
      currentPage,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }

  async findById(id: number): Promise<Kanji | null> {
    const kanji = await this.prismaService.kanji.findUnique({
      where: { id },
      include: {
        readings: {
          select: {
            id: true,
            kanjiId: true,
            readingType: true,
            reading: true,
            createdAt: true,
            updatedAt: true
          }
        },
        _count: {
          select: {
            vocabularies: true
          }
        }
      }
    })

    if (!kanji) {
      return null
    }

    return this.transformKanji(kanji)
  }

  async findByCharacter(character: string): Promise<Kanji | null> {
    const kanji = await this.prismaService.kanji.findUnique({
      where: { character },
      include: {
        _count: {
          select: {
            vocabularies: true
          }
        }
      }
    })

    if (!kanji) {
      return null
    }

    return this.transformKanji(kanji)
  }

  async create(data: CreateKanjiBodyType): Promise<Kanji> {
    const createData: any = {
      character: data.character,
      meaningKey: data.meaningKey,
      strokeCount: data.strokeCount,
      jlptLevel: data.jlptLevel
    }

    // Only add img if it exists in the data
    if (data.img) {
      createData.img = data.img
    }

    const result = await this.prismaService.kanji.create({
      data: createData,
      include: {
        _count: {
          select: {
            vocabularies: true
          }
        }
      }
    })

    return this.transformKanji(result)
  }

  async update(id: number, data: UpdateKanjiBodyType): Promise<Kanji> {
    const updateData: any = {
      character: data.character,
      meaningKey: data.meaningKey,
      strokeCount: data.strokeCount,
      jlptLevel: data.jlptLevel
    }

    // Only add img if it exists in the data
    if (data.img) {
      updateData.img = data.img
    }

    const result = await this.prismaService.kanji.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            vocabularies: true
          }
        }
      }
    })

    return this.transformKanji(result)
  }

  // Method riêng cho updateWithMeanings (không cần character và meaningKey)
  async updatePartial(id: number, data: Partial<UpdateKanjiBodyType>): Promise<Kanji> {
    const updateData: any = {
      strokeCount: data.strokeCount,
      jlptLevel: data.jlptLevel
    }

    // Only add img if it exists in the data
    if (data.img) {
      updateData.img = data.img
    }

    const result = await this.prismaService.kanji.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            vocabularies: true
          }
        }
      }
    })

    return this.transformKanji(result)
  }

  async delete(id: number): Promise<void> {
    await this.prismaService.kanji.delete({
      where: { id }
    })
  }

  async exists(id: number): Promise<boolean> {
    if (!id || isNaN(id)) {
      return false
    }

    const count = await this.prismaService.kanji.count({
      where: { id }
    })
    return count > 0
  }

  async existsByCharacter(character: string, excludeId?: number): Promise<boolean> {
    const where: any = { character }
    if (excludeId) {
      where.id = { not: excludeId }
    }

    const count = await this.prismaService.kanji.count({ where })
    return count > 0
  }

  // Statistics
  async getStats() {
    const [totalKanji, byJlptLevel] = await Promise.all([
      this.prismaService.kanji.count(),
      this.prismaService.kanji.groupBy({
        by: ['jlptLevel'],
        _count: {
          jlptLevel: true
        },
        where: {
          jlptLevel: { not: null }
        }
      })
    ])

    return {
      totalKanji,
      byJlptLevel: byJlptLevel.map((item) => ({
        jlptLevel: item.jlptLevel,
        count: item._count.jlptLevel
      }))
    }
  }

  // Transform methods
  private transformKanji(kanji: any): Kanji {
    return {
      id: kanji.id,
      character: kanji.character,
      meaningKey: kanji.meaningKey,
      strokeCount: kanji.strokeCount,
      jlptLevel: kanji.jlptLevel,
      img: kanji.img || null, // Handle case where img column doesn't exist
      createdAt: kanji.createdAt,
      updatedAt: kanji.updatedAt,
      readings: kanji.readings || []
    }
  }

  // Transaction method for deleting all Kanji data
  async deleteAllKanjiData() {
    return await this.prismaService.$transaction(async (tx) => {
      // 1. Đếm số lượng bản ghi sẽ bị xóa
      const kanjiCount = await tx.kanji.count()
      const readingCount = await tx.kanji_Reading.count()
      const vocabularyKanjiCount = await tx.vocabulary_Kanji.count()

      // 2. Lấy danh sách các meaningKey của Kanji để xóa Translation
      const kanjiMeaningKeys = await tx.kanji.findMany({
        select: { meaningKey: true }
      })
      const meaningKeys = kanjiMeaningKeys.map((k) => k.meaningKey)

      // 3. Xóa các bản ghi theo thứ tự để tránh lỗi foreign key constraint
      // Xóa Vocabulary_Kanji trước (bảng nối)
      await tx.vocabulary_Kanji.deleteMany()

      // Xóa Kanji_Reading
      await tx.kanji_Reading.deleteMany()

      // Xóa Translation liên quan đến Kanji
      if (meaningKeys.length > 0) {
        await tx.translation.deleteMany({
          where: {
            key: {
              in: meaningKeys
            }
          }
        })
      }

      // Xóa Kanji
      await tx.kanji.deleteMany()

      return {
        kanjiDeleted: kanjiCount,
        readingDeleted: readingCount,
        vocabularyKanjiDeleted: vocabularyKanjiCount,
        translationDeleted: meaningKeys.length
      }
    })
  }
}
