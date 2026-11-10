import {
  KanjiReading,
  CreateKanjiReadingBodyType,
  UpdateKanjiReadingBodyType
} from './entities/kanji-reading.entity'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { KanjiReadingSortField, SortOrder } from '@/common/enum/enum'

@Injectable()
export class KanjiReadingRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: {
    page: number
    limit: number
    kanjiId?: number
    readingType?: string
    sortBy?: KanjiReadingSortField
    sort?: SortOrder
  }) {
    const {
      page,
      limit,
      kanjiId,
      readingType,
      sortBy = KanjiReadingSortField.CREATED_AT,
      sort = SortOrder.DESC
    } = params
    const skip = (page - 1) * limit

    const where: any = {}

    if (kanjiId) {
      where.kanjiId = kanjiId
    }

    if (readingType) {
      where.readingType = readingType
    }

    const [data, total] = await Promise.all([
      this.prismaService.kanji_Reading.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sort },
        include: {
          kanji: true
        }
      }),
      this.prismaService.kanji_Reading.count({ where })
    ])

    return {
      data: data.map((item) => this.transformKanjiReading(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async findById(id: number): Promise<KanjiReading | null> {
    const result = await this.prismaService.kanji_Reading.findUnique({
      where: { id },
      include: {
        kanji: true
      }
    })

    if (!result) return null

    return this.transformKanjiReading(result)
  }

  async findByKanjiId(kanjiId: number): Promise<KanjiReading[]> {
    const results = await this.prismaService.kanji_Reading.findMany({
      where: { kanjiId },
      include: {
        kanji: true
      },
      orderBy: { id: 'asc' }
    })

    return results.map((item) => this.transformKanjiReading(item))
  }

  async findByReadingType(readingType: string): Promise<KanjiReading[]> {
    const results = await this.prismaService.kanji_Reading.findMany({
      where: { readingType },
      include: {
        kanji: true
      },
      orderBy: { id: 'asc' }
    })

    return results.map((item) => this.transformKanjiReading(item))
  }

  async create(data: CreateKanjiReadingBodyType): Promise<KanjiReading> {
    const result = await this.prismaService.kanji_Reading.create({
      data: {
        kanjiId: data.kanjiId,
        readingType: data.readingType,
        reading: data.reading
      },
      include: {
        kanji: true
      }
    })

    return this.transformKanjiReading(result)
  }

  async update(id: number, data: UpdateKanjiReadingBodyType): Promise<KanjiReading> {
    const result = await this.prismaService.kanji_Reading.update({
      where: { id },
      data: {
        readingType: data.readingType,
        reading: data.reading
      },
      include: {
        kanji: true
      }
    })

    return this.transformKanjiReading(result)
  }

  async delete(id: number): Promise<void> {
    await this.prismaService.kanji_Reading.delete({
      where: { id }
    })
  }

  async deleteByKanjiId(kanjiId: number): Promise<void> {
    await this.prismaService.kanji_Reading.deleteMany({
      where: { kanjiId }
    })
  }

  async count(where?: any): Promise<number> {
    return this.prismaService.kanji_Reading.count({ where })
  }

  async getStats() {
    const total = await this.prismaService.kanji_Reading.count()

    const byType = await this.prismaService.kanji_Reading.groupBy({
      by: ['readingType'],
      _count: {
        id: true
      }
    })

    return {
      total,
      byReadingType: byType.map((item) => ({
        readingType: item.readingType,
        count: item._count.id
      }))
    }
  }

  async existsByKanjiAndType(kanjiId: number, readingType: string): Promise<boolean> {
    const count = await this.prismaService.kanji_Reading.count({
      where: {
        kanjiId,
        readingType
      }
    })
    return count > 0
  }

  async existsByKanjiTypeAndReading(
    kanjiId: number,
    readingType: string,
    reading: string
  ): Promise<boolean> {
    const count = await this.prismaService.kanji_Reading.count({
      where: {
        kanjiId,
        readingType,
        reading
      }
    })
    return count > 0
  }

  async existsByKanjiId(kanjiId: number): Promise<boolean> {
    const count = await this.prismaService.kanji_Reading.count({
      where: { kanjiId }
    })
    return count > 0
  }

  async getReadingsByKanjiIds(kanjiIds: number[]) {
    const readings = await this.prismaService.kanji_Reading.findMany({
      where: {
        kanjiId: {
          in: kanjiIds
        }
      },
      include: {
        kanji: true
      }
    })

    return readings.map((item) => this.transformKanjiReading(item))
  }

  private transformKanjiReading(kanjiReading: any): KanjiReading {
    return {
      id: kanjiReading.id,
      kanjiId: kanjiReading.kanjiId,
      readingType: kanjiReading.readingType,
      reading: kanjiReading.reading,
      createdAt: kanjiReading.createdAt,
      updatedAt: kanjiReading.updatedAt
    }
  }
}
