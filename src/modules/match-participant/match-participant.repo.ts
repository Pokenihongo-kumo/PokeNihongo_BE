import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  CreateMatchParticipantBody,
  UpdateMatchParticipantBody
} from './dto/match-participant.zod-dto'
import {
  MATCH_PARTICIPANT_FIELDS,
  MatchParticipant
} from './entities/match-participant.entity'

@Injectable()
export class MatchParticipantRepo {
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
      data: CreateMatchParticipantBody
    },
    prismaTx?: PrismaClient
  ): Promise<MatchParticipant> {
    const client = prismaTx || this.prismaService
    return client.matchParticipant.create({
      data: {
        ...data,
        userId: data.userId || createdById
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
      data: UpdateMatchParticipantBody
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<MatchParticipant> {
    const client = prismaTx || this.prismaService
    return client.matchParticipant.update({
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
  ): Promise<MatchParticipant> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.matchParticipant.delete({
          where: { id }
        })
      : client.matchParticipant.update({
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
    const { where, orderBy } = parseQs(pagination.qs, MATCH_PARTICIPANT_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.matchParticipant.count({
        where: filterWhere
      }),
      this.prismaService.matchParticipant.findMany({
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

  findById(id: number): Promise<MatchParticipant | null> {
    return this.prismaService.matchParticipant.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findByMatchId(matchId: number): Promise<MatchParticipant[]> {
    return this.prismaService.matchParticipant.findMany({
      where: {
        matchId,
        deletedAt: null
      }
    })
  }

  // ---- Acceptance timeout (MatchParticipantTimeoutProcessor, one transaction) ----

  // Locks the match's live participants (FOR UPDATE) so two timeouts or a
  // late answer cannot decide the match twice
  lockByMatch(matchId: number, prismaTx: PrismaClient) {
    return prismaTx.$queryRaw<Array<{ id: number; hasAccepted: boolean | null }>>`
      SELECT id, "hasAccepted"
      FROM "MatchParticipant"
      WHERE "matchId" = ${matchId} AND "deletedAt" IS NULL
      FOR UPDATE
    `
  }

  markDeclined(id: number, prismaTx: PrismaClient) {
    return prismaTx.matchParticipant.update({
      where: { id },
      data: { hasAccepted: false }
    })
  }

  findLiveByMatch(matchId: number, prismaTx: PrismaClient) {
    return prismaTx.matchParticipant.findMany({
      where: { matchId, deletedAt: null }
    })
  }
}
