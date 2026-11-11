import { AnswerSortField, SortOrder } from '@/common/enum/enum'
import { PrismaService } from '@/shared/services/prisma.service'
import { toSkipTake } from '@/shared/utils/pagination'
import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { GetAnswerListQueryType } from './entities/answer.entity'

@Injectable()
export class AnswerRepo {
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
    const where: Prisma.AnswerWhereInput = {
      ...(questionBankId && { questionBankId }),
      ...(isCorrect !== undefined && { isCorrect }),
      ...(search && { answerJp: { contains: search, mode: 'insensitive' } })
    }
    // Ties on the sort field are broken by id
    const direction = sort as Prisma.SortOrder
    const orderBy: Prisma.AnswerOrderByWithRelationInput[] =
      sortBy === 'id' ? [{ id: direction }] : [{ [sortBy]: direction }, { id: direction }]

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
        orderBy,
        ...toSkipTake(currentPage, pageSize)
      }),
      this.prismaService.answer.count({ where })
    ])

    return { items, total }
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

  async create(data: Prisma.AnswerUncheckedCreateInput) {
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

  async update(id: number, data: Prisma.AnswerUncheckedUpdateInput) {
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

  async updateAnswerKey(id: number, answerKey: string) {
    return this.prismaService.answer.update({
      where: { id },
      data: { answerKey }
    })
  }

  async checkAnswerExists(questionBankId: number, answerJp: string, excludeId?: number) {
    return this.prismaService.answer.findFirst({
      where: { questionBankId, answerJp, ...(excludeId && { id: { not: excludeId } }) }
    })
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
