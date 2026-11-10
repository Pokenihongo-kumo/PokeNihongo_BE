import { toSkipTake } from '@/shared/utils/pagination'
import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  CreateGrammarUsageBodyType,
  UpdateGrammarUsageBodyType,
  GetGrammarUsageListQueryType
} from './entities/grammar-usage.entity'
import { GrammarUsageSortField, SortOrder } from '@/common/enum/enum'

@Injectable()
export class GrammarUsageRepo {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: GetGrammarUsageListQueryType) {
    const {
      page,
      limit,
      grammarId,
      sortBy = GrammarUsageSortField.CREATED_AT,
      sort = SortOrder.DESC
    } = params

    const where: Prisma.GrammarUsageWhereInput = grammarId ? { grammarId } : {}

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
        ...toSkipTake(page, limit)
      }),
      this.prismaService.grammarUsage.count({ where })
    ])

    return { data, total }
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
    const count = await this.prismaService.grammarUsage.count({
      where: { grammarId, explanationKey, ...(excludeId && { id: { not: excludeId } }) }
    })
    return count > 0
  }
}
