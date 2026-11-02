import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  CreateAnswerBodyType,
  UpdateAnswerBodyType,
  GetAnswerListQueryType
} from './entities/answer.entities'
import { AnswerSortField, SortOrder } from '@/common/enum/enum'

@Injectable()
export class AnswerRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany(params: GetAnswerListQueryType) {
    const {
      currentPage,
      pageSize,
      questionBankId,
      isCorrect,
      search,
      sortBy = AnswerSortField.CREATED_AT,
      sort = SortOrder.DESC
    } = params
    const skip = (currentPage - 1) * pageSize

    const where: any = {}

    if (questionBankId) {
      where.questionBankId = questionBankId
    }

    if (isCorrect !== undefined) {
      where.isCorrect = isCorrect
    }

    if (search) {
      where.answerJp = {
        contains: search,
        mode: 'insensitive'
      }
    }

    const [items, total] = await Promise.all([
      this.prismaService.answer.findMany({
        where,
        include: {
          questionBank: {
            select: {
              id: true,
              questionJp: true,
              questionKey: true
            }
          }
        },
        orderBy: (() => {
          const primaryField = (sortBy ?? 'createdAt') as string
          const direction = (sort ?? 'desc') as 'asc' | 'desc'
          if (primaryField !== 'id') {
            return [{ [primaryField]: direction } as any, { id: direction } as any]
          }
          return [{ id: direction } as any]
        })(),
        skip,
        take: pageSize
      }),
      this.prismaService.answer.count({ where })
    ])

    return {
      items,
      total,
      page: currentPage,
      limit: pageSize
    }
  }

  async findById(id: number) {
    return this.prismaService.answer.findUnique({
      where: { id },
      include: {
        questionBank: {
          select: {
            id: true,
            questionJp: true,
            questionKey: true
          }
        }
      }
    })
  }

  async create(data: any) {
    return this.prismaService.answer.create({
      data,
      include: {
        questionBank: {
          select: {
            id: true,
            questionJp: true,
            questionKey: true
          }
        }
      }
    })
  }

  async update(id: number, data: UpdateAnswerBodyType) {
    return this.prismaService.answer.update({
      where: { id },
      data,
      include: {
        questionBank: {
          select: {
            id: true,
            questionJp: true,
            questionKey: true
          }
        }
      }
    })
  }

  async delete(id: number) {
    return this.prismaService.answer.delete({
      where: { id }
    })
  }

  // Helper methods

  async checkAnswerKeyExists(answerKey: string, excludeId?: number) {
    const where: any = { answerKey }
    if (excludeId) {
      where.id = { not: excludeId }
    }

    const count = await this.prismaService.answer.count({ where })
    return count > 0
  }

  async updateAnswerKey(id: number, answerKey: string) {
    return this.prismaService.answer.update({
      where: { id },
      data: { answerKey }
    })
  }

  async checkAnswerExistsById(id: number) {
    const count = await this.prismaService.answer.count({ where: { id } })
    return count > 0
  }

  async checkAnswerExists(questionBankId: number, answerJp: string, excludeId?: number) {
    const where: any = {
      questionBankId,
      answerJp
    }
    if (excludeId) {
      where.id = { not: excludeId }
    }
    return this.prismaService.answer.findFirst({ where })
  }

  async checkQuestionExists(questionId: number) {
    const count = await this.prismaService.questionBank.count({
      where: { id: questionId }
    })
    return count > 0
  }

  async getQuestionType(questionBankId: number) {
    const question = await this.prismaService.questionBank.findUnique({
      where: { id: questionBankId },
      select: { questionType: true }
    })
    return question?.questionType || null
  }

  async countAnswersByQuestionId(questionBankId: number) {
    return await this.prismaService.answer.count({
      where: { questionBankId: questionBankId }
    })
  }

  async hasCorrectAnswer(questionBankId: number) {
    const count = await this.prismaService.answer.count({
      where: {
        questionBankId: questionBankId,
        isCorrect: true
      }
    })
    return count > 0
  }
}
