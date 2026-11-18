import {
  MatchRoundParticipantStatus,
  RoundStatus
} from '@/common/constants/match.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateMatchRoundParticipantBody,
  MATCH_PARTICIPANT_FIELDS,
  MatchRoundParticipant,
  UpdateMatchRoundParticipantBody
} from './entities/match-round-participant.entity'

@Injectable()
export class MatchRoundParticipantRepo {
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
      data: CreateMatchRoundParticipantBody
    },
    prismaTx?: PrismaClient
  ): Promise<MatchRoundParticipant> {
    const client = prismaTx || this.prismaService
    return client.matchRoundParticipant.create({
      data: {
        ...data
      }
    })
  }

  createBulk(
    data: Array<{
      matchRoundId: number
      matchParticipantId: number
      selectedUserPokemonId: number | null
      orderSelected?: number
      endTimeSelected?: Date | null
    }>,
    prismaTx?: PrismaClient
  ): Promise<{ count: number }> {
    const client = prismaTx || this.prismaService
    return client.matchRoundParticipant.createMany({
      data
    })
  }

  update(
    {
      id,
      data,
      updatedById
    }: {
      id: number
      data: UpdateMatchRoundParticipantBody
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<MatchRoundParticipant> {
    const client = prismaTx || this.prismaService
    return client.matchRoundParticipant.update({
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
  ): Promise<MatchRoundParticipant> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.matchRoundParticipant.delete({
          where: { id }
        })
      : client.matchRoundParticipant.update({
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
      this.prismaService.matchRoundParticipant.count({
        where: filterWhere
      }),
      this.prismaService.matchRoundParticipant.findMany({
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

  findById(id: number): Promise<MatchRoundParticipant | null> {
    return this.prismaService.matchRoundParticipant.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  async findByMatchRoundIdAndUserId(
    matchRoundId: number,
    userId: number
  ): Promise<MatchRoundParticipant | null> {
    return this.prismaService.matchRoundParticipant.findFirst({
      where: {
        matchRoundId,
        matchParticipant: {
          userId
        },
        deletedAt: null
      }
    })
  }

  async findMany(options: {
    where: any
    orderBy?: any
  }): Promise<MatchRoundParticipant[]> {
    return this.prismaService.matchRoundParticipant.findMany(options)
  }

  // ---- Picks and round set-up (MatchRoundParticipantService and its timeout processor) ----

  findLiveInRoundOrdered(matchRoundId: number) {
    return this.prismaService.matchRoundParticipant.findMany({
      where: { matchRoundId, deletedAt: null },
      orderBy: { orderSelected: 'asc' }
    })
  }

  setRoundParticipantsPending(matchRoundId: number) {
    return this.prismaService.matchRoundParticipant.updateMany({
      where: { matchRoundId },
      data: { status: RoundStatus.PENDING }
    })
  }

  findInRoundWithUsers(matchRoundId: number) {
    return this.prismaService.matchRoundParticipant.findMany({
      where: { matchRoundId, deletedAt: null },
      include: { matchParticipant: { include: { user: true } } },
      orderBy: { orderSelected: 'asc' }
    })
  }

  setQuestionsTotal(ids: number[], total: number) {
    return this.prismaService.matchRoundParticipant.updateMany({
      where: { id: { in: ids } },
      data: { questionsTotal: total }
    })
  }

  findPicksInRound(matchRoundId: number) {
    return this.prismaService.matchRoundParticipant.findMany({
      where: { matchRoundId, deletedAt: null },
      select: { id: true, selectedUserPokemon: { select: { pokemonId: true } } }
    })
  }

  assignDebuff(id: number, debuffId: number, questionsTotal: number) {
    return this.prismaService.matchRoundParticipant.update({
      where: { id },
      data: { debuffId, questionsTotal }
    })
  }

  addQuestionsTotal(id: number, by: number) {
    return this.prismaService.matchRoundParticipant.update({
      where: { id },
      data: {
        questionsTotal: {
          increment: by
        }
      }
    })
  }

  setLiveRoundParticipantsPending(matchRoundId: number) {
    return this.prismaService.matchRoundParticipant.updateMany({
      where: { matchRoundId, deletedAt: null },
      data: { status: RoundStatus.PENDING }
    })
  }

  // ---- Pick timeout and round start (MatchRoundParticipantTimeoutProcessor) ----

  findWithRoundParticipants(id: number) {
    return this.prismaService.matchRoundParticipant.findUnique({
      where: { id },
      include: {
        matchRound: {
          include: {
            participants: {
              orderBy: {
                orderSelected: 'asc'
              }
            }
          }
        }
      }
    })
  }

  // Battle exception: match-participant imports this module, its service is out of reach
  findMatchParticipant(id: number) {
    return this.prismaService.matchParticipant.findUnique({
      where: { id }
    })
  }

  // Picked for the player (timeout): PENDING
  setPickedPending(id: number, selectedUserPokemonId: number) {
    return this.prismaService.matchRoundParticipant.update({
      where: { id },
      data: {
        selectedUserPokemonId,
        status: MatchRoundParticipantStatus.PENDING
      }
    })
  }

  setPickDeadline(id: number, endTimeSelected: Date) {
    return this.prismaService.matchRoundParticipant.update({
      where: { id },
      data: {
        endTimeSelected
      }
    })
  }

  findPickStateInRound(matchRoundId: number) {
    return this.prismaService.matchRoundParticipant.findMany({
      where: { matchRoundId },
      select: { id: true, selectedUserPokemonId: true }
    })
  }

  findLiveInRoundWithPicks(matchRoundId: number) {
    return this.prismaService.matchRoundParticipant.findMany({
      where: { matchRoundId, deletedAt: null },
      include: {
        selectedUserPokemon: { select: { pokemonId: true } },
        matchRound: true
      },
      orderBy: { orderSelected: 'asc' }
    })
  }

  // Battle exception, as findMatchParticipant
  findMatchParticipants(matchId: number) {
    return this.prismaService.matchParticipant.findMany({
      where: { matchId, deletedAt: null },
      select: { id: true, userId: true }
    })
  }

  setRoundParticipantsInProgress(matchRoundId: number) {
    return this.prismaService.matchRoundParticipant.updateMany({
      where: { matchRoundId },
      data: { status: 'IN_PROGRESS' }
    })
  }

  findLiveInRoundForStart(matchRoundId: number) {
    return this.prismaService.matchRoundParticipant.findMany({
      where: { matchRoundId, deletedAt: null },
      include: {
        matchParticipant: {
          include: {
            user: true
          }
        },
        matchRound: true,
        selectedUserPokemon: {
          include: {
            pokemon: true
          }
        },
        debuff: true
      },
      orderBy: { orderSelected: 'asc' }
    })
  }
}
