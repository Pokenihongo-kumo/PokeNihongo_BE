import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  CreateGrammarUsageBodyType,
  UpdateGrammarUsageBodyType,
  GetGrammarUsageListQueryType
} from './entities/grammar-usage.entities'
import { GrammarUsageSortField, SortOrder } from '@/common/enum/enum'

@Injectable()
export class GrammarUsageRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: GetGrammarUsageListQueryType) {
    const {
      page,
      limit,
      grammarId,
      sortBy = GrammarUsageSortField.CREATED_AT,
      sort = SortOrder.DESC
    } = params
    const skip = (page - 1) * limit

    const where: any = {}

    if (grammarId) {
      where.grammarId = grammarId
    }

    const [data, total] = await Promise.all([
      this.prismaService.grammarUsage.findMany({
        where,
        include: {
          grammar: {
            select: {
              id: true,
              structure: true,
              level: true
            }
          }
        },
        orderBy: { [sortBy]: sort },
        skip,
        take: limit
      }),
      this.prismaService.grammarUsage.count({ where })
    ])

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async findById(id: number) {
    return this.prismaService.grammarUsage.findUnique({
      where: { id },
      include: {
        grammar: {
          select: {
            id: true,
            structure: true,
            level: true
          }
        }
      }
    })
  }

  async create(data: CreateGrammarUsageBodyType) {
    return this.prismaService.grammarUsage.create({
      data,
      include: {
        grammar: {
          select: {
            id: true,
            structure: true,
            level: true
          }
        }
      }
    })
  }

  async update(id: number, data: UpdateGrammarUsageBodyType) {
    return this.prismaService.grammarUsage.update({
      where: { id },
      data,
      include: {
        grammar: {
          select: {
            id: true,
            structure: true,
            level: true
          }
        }
      }
    })
  }

  async delete(id: number) {
    return this.prismaService.grammarUsage.delete({
      where: { id }
    })
  }

  // Helper methods
  async checkGrammarUsageExists(id: number) {
    const count = await this.prismaService.grammarUsage.count({
      where: { id }
    })
    return count > 0
  }

  async checkGrammarExists(grammarId: number) {
    const count = await this.prismaService.grammar.count({
      where: { id: grammarId }
    })
    return count > 0
  }

  async checkUsageExistsInGrammar(
    grammarId: number,
    explanationKey: string,
    excludeId?: number
  ) {
    const where: any = {
      grammarId,
      explanationKey
    }
    if (excludeId) {
      where.id = { not: excludeId }
    }

    const count = await this.prismaService.grammarUsage.count({ where })
    return count > 0
  }
}
