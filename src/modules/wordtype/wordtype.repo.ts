import {
  WordType,
  CreateWordTypeBodyType,
  UpdateWordTypeBodyType
} from './entities/wordtype.entity'
import { PrismaService } from '@/shared/services/prisma.service'
import { toSkipTake } from '@/shared/utils/pagination'
import { Injectable } from '@nestjs/common'
import { Prisma, WordType as WordTypeRow } from '@prisma/client'

@Injectable()
export class WordTypeRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: {
    page: number
    limit: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }) {
    const { page, limit, sortBy = 'id', sortOrder = 'asc' } = params

    const [data, total] = await Promise.all([
      this.prismaService.wordType.findMany({
        ...toSkipTake(page, limit),
        orderBy: { [sortBy]: sortOrder }
      }),
      this.prismaService.wordType.count()
    ])

    return { data: data.map((item) => this.transformWordType(item)), total }
  }

  async findById(id: number): Promise<WordType | null> {
    const result = await this.prismaService.wordType.findUnique({
      where: { id }
    })

    if (!result) return null

    return this.transformWordType(result)
  }

  // Removed findByTag - use findByNameKey instead

  async findByNameKey(nameKey: string): Promise<WordType | null> {
    const result = await this.prismaService.wordType.findUnique({
      where: { nameKey }
    })

    if (!result) return null

    return this.transformWordType(result)
  }

  async create(data: CreateWordTypeBodyType): Promise<WordType> {
    const createData: Prisma.WordTypeCreateInput = {
      nameKey: data.nameKey,
      ...(data.id && { id: data.id })
    }

    const result = await this.prismaService.wordType.create({
      data: createData
    })

    // An explicit id (startup seed, admin) does not move the id sequence; without
    // this the next create without id collides on the primary key
    if (data.id) {
      await this.syncIdSequence()
    }

    return this.transformWordType(result)
  }

  // Moves the id sequence past the highest id (rows inserted with explicit ids)
  async syncIdSequence(): Promise<void> {
    await this.prismaService.$executeRaw`
      SELECT setval(
        pg_get_serial_sequence('"WordType"', 'id'),
        GREATEST((SELECT MAX(id) FROM "WordType"), 1)
      )`
  }

  async update(id: number, data: UpdateWordTypeBodyType): Promise<WordType> {
    const result = await this.prismaService.wordType.update({
      where: { id },
      data: {
        ...(data.nameKey && { nameKey: data.nameKey })
      }
    })

    return this.transformWordType(result)
  }

  async delete(id: number): Promise<void> {
    await this.prismaService.wordType.delete({
      where: { id }
    })
  }

  async count(where?: Prisma.WordTypeWhereInput): Promise<number> {
    return this.prismaService.wordType.count({ where })
  }

  async existsByNameKey(nameKey: string, excludeId?: number): Promise<boolean> {
    const count = await this.prismaService.wordType.count({
      where: {
        nameKey,
        ...(excludeId && { id: { not: excludeId } })
      }
    })
    return count > 0
  }

  async getStats() {
    const total = await this.prismaService.wordType.count()

    return {
      total
    }
  }

  private transformWordType(wordType: WordTypeRow): WordType {
    return {
      id: wordType.id,
      nameKey: wordType.nameKey,
      createdAt: wordType.createdAt,
      updatedAt: wordType.updatedAt
    }
  }
}
