import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { MatchRoundNumberType, RoundStatus } from '@/common/constants/match.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaService } from '@/shared/services/prisma.service'
import { MatchRoundParticipant } from '../match-round-participant/entities/match-round-participant.entity'
import { CreateMatchRoundBody, UpdateMatchRoundBody } from './dto/match-round.zod-dto'
import { MATCH_FIELDS, MatchRound } from './entities/match-round.entity'

@Injectable()
export class MatchRoundRepo {
  constructor(private prismaService: PrismaService) {}

  // Wrapper cho transaction
  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }

  create(
    {
      createdById,
      data
    }: {
      createdById: number | null
      data: CreateMatchRoundBody
    },
    prismaTx?: PrismaClient
  ): Promise<MatchRound> {
    const client = prismaTx || this.prismaService
    return client.matchRound.create({
      data: {
        ...data
      }
    })
  }

  async update(
    {
      id,
      updatedById,
      data
    }: {
      id: number
      updatedById?: number
      data: UpdateMatchRoundBody
    },
    prismaTx?: PrismaClient
  ): Promise<MatchRound> {
    const client = prismaTx || this.prismaService

    const updatedMatchRound = await client.matchRound.update({
      where: { id, deletedAt: null },
      data: {
        ...data
      }
    })

    return updatedMatchRound
  }

  async delete(
    {
      id,
      deletedById
    }: {
      id: number
      deletedById: number
    },
    isHard?: boolean,
    prismaTx?: PrismaClient
  ): Promise<MatchRound> {
    const client = prismaTx || this.prismaService
    const result = isHard
      ? await this.prismaService.matchRound.delete({
          where: {
            id
          }
        })
      : await client.matchRound.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date()
          }
        })
    return result
  }

  async list(pagination: PaginationQuery, langId?: number) {
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, MATCH_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    // Build base where
    const where: any = { deletedAt: null, ...rawWhere }

    // Support filtering by nameTranslation/nameTranslations via relational filter

    const [totalItems, data] = await Promise.all([
      this.prismaService.matchRound.count({ where }),
      this.prismaService.matchRound.findMany({
        where,

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

  async listByUser(pagination: PaginationQuery, userId: number) {
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, MATCH_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    // Build base where
    const where: any = { deletedAt: null, ...rawWhere }

    // Support filtering by nameTranslation/nameTranslations via relational filter

    const [totalItems, data] = await Promise.all([
      this.prismaService.matchRound.count({ where }),
      this.prismaService.matchRound.findMany({
        where,
        include: {
          participants: {
            orderBy: {
              orderSelected: 'asc'
            }
          }
        },
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

  findById(id: number): Promise<MatchRound | null> {
    return this.prismaService.matchRound.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findByMatchIdAndRoundNumber(
    matchId: number,
    roundNumber: MatchRoundNumberType
  ): Promise<MatchRound | null> {
    return this.prismaService.matchRound.findFirst({
      where: {
        matchId,
        roundNumber: roundNumber as any, // roundNumber từ FE là number, nhưng DB schema là enum
        deletedAt: null
      }
    })
  }

  updateWinnerRoundWithUserIdById({
    id,
    roundWinnerId
  }: {
    id: number
    roundWinnerId: number
  }) {
    return this.prismaService.matchRound.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        roundWinnerId,
        status: RoundStatus.COMPLETED,
        updatedAt: new Date()
      }
    })
  }

  findByIdWithParticipant(
    id: number
  ): Promise<(MatchRound & { participants: MatchRoundParticipant[] }) | null> {
    return this.prismaService.matchRound.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        participants: true
      }
    }) as unknown as Promise<
      (MatchRound & { participants: MatchRoundParticipant[] }) | null
    >
  }

  findByIdWithMatchAndParticipants(id: number) {
    return this.prismaService.matchRound.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        match: {
          include: {
            participants: true
          }
        },
        participants: true
      }
    })
  }

  findPreviousRoundWithParticipants(
    matchId: number,
    currentRoundNumber: MatchRoundNumberType
  ) {
    // Map để lấy round trước đó
    const previousRoundMap = {
      TWO: 'ONE',
      THREE: 'TWO'
    }

    const previousRoundNumber = previousRoundMap[currentRoundNumber]
    if (!previousRoundNumber) return null

    return this.prismaService.matchRound.findFirst({
      where: {
        matchId,
        roundNumber: previousRoundNumber as any,
        deletedAt: null
      },
      include: {
        participants: {
          orderBy: {
            orderSelected: 'asc'
          }
        }
      }
    })
  }

  listNowByUser(matchId: number) {
    return this.prismaService.matchRound.findMany({
      where: {
        matchId,
        deletedAt: null
      },
      include: {
        participants: {
          include: {
            matchParticipant: {
              include: {
                user: true
              }
            },
            selectedUserPokemon: {
              include: {
                pokemon: true
              }
            }
          }
        }
      },
      orderBy: {
        roundNumber: 'asc'
      }
    })
  }

  // A round is created with its participant rows (POST /match-round): the
  // round owns them at creation, so match-round does not call back into
  // match-round-participant (B6)
  createParticipants(
    data: Array<{
      matchRoundId: number
      matchParticipantId: number
      selectedUserPokemonId: number | null
      orderSelected?: number
      endTimeSelected?: Date | null
    }>,
    prismaTx: PrismaClient
  ): Promise<{ count: number }> {
    return prismaTx.matchRoundParticipant.createMany({ data })
  }

  // ---- A match's three rounds, made when both players accept (in their transaction) ----

  createRoundRow(
    matchId: number,
    roundNumber: Prisma.MatchRoundUncheckedCreateInput['roundNumber'],
    prismaTx: PrismaClient
  ) {
    return prismaTx.matchRound.create({
      data: {
        matchId,
        roundNumber
      }
    })
  }

  // ---- POST /match-round (in its transaction) ----

  // The round participants just created, in pick order
  findParticipantsOfRound(matchRoundId: number, prismaTx: PrismaClient) {
    return prismaTx.matchRoundParticipant.findMany({
      where: {
        matchRoundId
      },
      orderBy: {
        orderSelected: 'asc'
      }
    })
  }

  // ---- Round rows for the pick flow (match-round-participant) ----

  setRoundPending(id: number) {
    return this.prismaService.matchRound.update({
      where: { id },
      data: { status: RoundStatus.PENDING }
    })
  }

  findRoundsWithPicks(matchId: number) {
    return this.prismaService.matchRound.findMany({
      where: { matchId, deletedAt: null },
      include: {
        participants: {
          include: {
            selectedUserPokemon: { include: { pokemon: true } }
          }
        }
      },
      orderBy: { roundNumber: 'asc' }
    })
  }

  findRoundsWithParticipants(matchId: number) {
    return this.prismaService.matchRound.findMany({
      where: { matchId, deletedAt: null },
      include: { participants: true }
    })
  }

  findRoundWithMatch(id: number) {
    return this.prismaService.matchRound.findUnique({
      where: { id },
      include: { match: true }
    })
  }

  // ---- Round rows for the pick timeout and round start ----

  findMatchIdOfRound(id: number) {
    return this.prismaService.matchRound.findUnique({
      where: { id },
      select: { matchId: true }
    })
  }

  findLiveRoundsOfMatch(matchId: number) {
    return this.prismaService.matchRound.findMany({
      where: { matchId, deletedAt: null }
    })
  }

  findRoundByNumberWithParticipants(
    matchId: number,
    roundNumber: Prisma.MatchRoundUncheckedCreateInput['roundNumber']
  ) {
    return this.prismaService.matchRound.findFirst({
      where: {
        matchId,
        roundNumber,
        deletedAt: null
      },
      include: {
        participants: {
          orderBy: {
            orderSelected: 'asc'
          }
        }
      }
    })
  }

  findRoundStatus(id: number) {
    return this.prismaService.matchRound.findUnique({
      where: { id },
      select: { status: true }
    })
  }

  // IN_PROGRESS until endTimeRound (10 minutes from the start)
  startRound(id: number, endTimeRound: Date) {
    return this.prismaService.matchRound.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        endTimeRound: endTimeRound // 10 minutes
      }
    })
  }
}
