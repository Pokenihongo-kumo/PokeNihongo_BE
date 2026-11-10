import { KanjiReadingSortField, SortOrder } from '@/common/enum/enum'
import { PrismaService } from '@/shared/services/prisma.service'
import { toSkipTake } from '@/shared/utils/pagination'
import { Injectable } from '@nestjs/common'
import { Kanji_Reading, Prisma } from '@prisma/client'
import {
  CreateKanjiReadingBodyType,
  GetKanjiReadingListQueryType,
  KanjiReading,
  UpdateKanjiReadingBodyType
} from './entities/kanji-reading.entity'

@Injectable()
export class KanjiReadingRepo {
  constructor(private readonly prismaService: PrismaService) {}

  // `search` is accepted by the query schema but has never filtered anything
  async findMany(
    params: GetKanjiReadingListQueryType
  ): Promise<{ data: KanjiReading[]; total: number }> {
    const {
      page,
      limit,
      kanjiId,
      readingType,
      sortBy = KanjiReadingSortField.CREATED_AT,
      sort = SortOrder.DESC
    } = params
    const where: Prisma.Kanji_ReadingWhereInput = {
      ...(kanjiId && { kanjiId }),
      ...(readingType && { readingType })
    }

    const [data, total] = await Promise.all([
      this.prismaService.kanji_Reading.findMany({
        where,
        orderBy: { [sortBy]: sort },
        ...toSkipTake(page, limit)
      }),
      this.prismaService.kanji_Reading.count({ where })
    ])
    return { data: data.map((item) => this.toKanjiReading(item)), total }
  }

  async findById(id: number): Promise<KanjiReading | null> {
    const reading = await this.prismaService.kanji_Reading.findUnique({ where: { id } })
    return reading && this.toKanjiReading(reading)
  }

  async findByKanjiId(kanjiId: number): Promise<KanjiReading[]> {
    const readings = await this.prismaService.kanji_Reading.findMany({
      where: { kanjiId },
      orderBy: { id: 'asc' }
    })
    return readings.map((item) => this.toKanjiReading(item))
  }

  async findByReadingType(readingType: string): Promise<KanjiReading[]> {
    const readings = await this.prismaService.kanji_Reading.findMany({
      where: { readingType },
      orderBy: { id: 'asc' }
    })
    return readings.map((item) => this.toKanjiReading(item))
  }

  async create(data: CreateKanjiReadingBodyType): Promise<KanjiReading> {
    const reading = await this.prismaService.kanji_Reading.create({
      data: {
        kanjiId: data.kanjiId,
        readingType: data.readingType,
        reading: data.reading
      }
    })
    return this.toKanjiReading(reading)
  }

  async update(id: number, data: UpdateKanjiReadingBodyType): Promise<KanjiReading> {
    const reading = await this.prismaService.kanji_Reading.update({
      where: { id },
      data: { readingType: data.readingType, reading: data.reading }
    })
    return this.toKanjiReading(reading)
  }

  async delete(id: number): Promise<void> {
    await this.prismaService.kanji_Reading.delete({ where: { id } })
  }

  async deleteByKanjiId(kanjiId: number): Promise<void> {
    await this.prismaService.kanji_Reading.deleteMany({ where: { kanjiId } })
  }

  async getStats(): Promise<{
    total: number
    byReadingType: { readingType: string; count: number }[]
  }> {
    const [total, byType] = await Promise.all([
      this.prismaService.kanji_Reading.count(),
      this.prismaService.kanji_Reading.groupBy({
        by: ['readingType'],
        _count: { id: true }
      })
    ])
    return {
      total,
      byReadingType: byType.map((item) => ({
        readingType: item.readingType,
        count: item._count.id
      }))
    }
  }

  async existsByKanjiTypeAndReading(
    kanjiId: number,
    readingType: string,
    reading: string
  ): Promise<boolean> {
    const count = await this.prismaService.kanji_Reading.count({
      where: { kanjiId, readingType, reading }
    })
    return count > 0
  }

  private toKanjiReading(reading: Kanji_Reading): KanjiReading {
    return {
      id: reading.id,
      kanjiId: reading.kanjiId,
      readingType: reading.readingType,
      reading: reading.reading,
      createdAt: reading.createdAt,
      updatedAt: reading.updatedAt
    }
  }
}
