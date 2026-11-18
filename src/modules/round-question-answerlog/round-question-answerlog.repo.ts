import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateRoundQuestionsAnswerLogBody,
  RoundQuestionsAnswerLog,
  USER_SEASON_HISTORY_FIELDS,
  UpdateRoundQuestionsAnswerLogBody
} from './entities/round-question-answerlog.entity'

@Injectable()
export class RoundQuestionsAnswerLogRepo {
  constructor(private prismaService: PrismaService) {}
  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }
  create(
    {
      createdById,
      data
    }: {
      createdById: number
      data: CreateRoundQuestionsAnswerLogBody
    },
    prismaTx?: PrismaClient
  ): Promise<RoundQuestionsAnswerLog> {
    const client = prismaTx || this.prismaService
    return client.roundQuestionsAnswerLog.create({
      data: {
        ...data
      }
    })
  }

  update(
    {
      id,
      data,
      updatedById
    }: {
      id: number
      data: UpdateRoundQuestionsAnswerLogBody
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<RoundQuestionsAnswerLog> {
    const client = prismaTx || this.prismaService
    return client.roundQuestionsAnswerLog.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...data
      }
    })
  }

  delete(
    id: number,
    isHard?: boolean,
    prismaTx?: PrismaClient
  ): Promise<RoundQuestionsAnswerLog> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.roundQuestionsAnswerLog.delete({
          where: { id }
        })
      : client.roundQuestionsAnswerLog.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date()
          }
        })
  }

  async list(pagination: PaginationQuery) {
    const { where, orderBy } = parseQs(pagination.qs, USER_SEASON_HISTORY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.roundQuestionsAnswerLog.count({
        where: filterWhere
      }),
      this.prismaService.roundQuestionsAnswerLog.findMany({
        where: filterWhere,

        orderBy,
        skip,
        take
      })
    ])

    return {
      results: data,
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }

  findById(id: number): Promise<RoundQuestionsAnswerLog | null> {
    return this.prismaService.roundQuestionsAnswerLog.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }
}
