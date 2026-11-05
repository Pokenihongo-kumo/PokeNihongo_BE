import {
  WordType,
  CreateWordTypeBodyType,
  UpdateWordTypeBodyType
} from './entities/wordtype.entity'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'

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
    const skip = (page - 1) * limit

    const where: any = {}

    const [data, total] = await Promise.all([
      this.prismaService.wordType.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      this.prismaService.wordType.count({ where })
    ])

    return {
      data: data.map((item) => this.transformWordType(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
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
    const createData: any = {
      nameKey: data.nameKey
    }

    // Nếu có ID, thêm vào data
    if (data.id) {
      createData.id = data.id
    }

    const result = await this.prismaService.wordType.create({
      data: createData
    })

    return this.transformWordType(result)
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

  async count(where?: any): Promise<number> {
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

  private transformWordType(wordType: any): WordType {
    return {
      id: wordType.id,
      nameKey: wordType.nameKey,
      createdAt: wordType.createdAt,
      updatedAt: wordType.updatedAt
    }
  }
}
