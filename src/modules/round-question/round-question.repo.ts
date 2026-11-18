import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateRoundQuestionBodyType,
  RoundQuestionType,
  USER_SEASON_HISTORY_FIELDS,
  UpdateRoundQuestionBodyType
} from './entities/round-question.entity'

@Injectable()
export class RoundQuestionRepo {
  constructor(private prismaService: PrismaService) {}
  // options as $transaction takes them (completing a match sets a timeout)
  async withTransaction<T>(
    callback: (prismaTx: PrismaClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number }
  ): Promise<T> {
    return this.prismaService.$transaction((tx) => callback(tx as PrismaClient), options)
  }
  create(
    {
      createdById,
      data
    }: {
      createdById: number
      data: CreateRoundQuestionBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<RoundQuestionType> {
    const client = prismaTx || this.prismaService
    return client.roundQuestion.create({
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
      data: UpdateRoundQuestionBodyType
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<RoundQuestionType> {
    const client = prismaTx || this.prismaService
    return client.roundQuestion.update({
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
  ): Promise<RoundQuestionType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.roundQuestion.delete({
          where: { id }
        })
      : client.roundQuestion.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date()
          }
        })
  }

  async list(pagination: PaginationQueryType) {
    const { where, orderBy } = parseQs(pagination.qs, USER_SEASON_HISTORY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.roundQuestion.count({
        where: filterWhere
      }),
      this.prismaService.roundQuestion.findMany({
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

  findById(id: number): Promise<RoundQuestionType | null> {
    return this.prismaService.roundQuestion.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  async findByMatchRoundParticipantId(matchRoundParticipantId: number) {
    return this.prismaService.roundQuestion.findMany({
      where: { matchRoundParticipantId, deletedAt: null },
      orderBy: { orderNumber: 'asc' }
    })
  }

  // ---- Round flow (RoundQuestionService). Rounds and their participants are read and written here: match-round and match-round-participant import round-question (battle exception, B6c) ----

  // The question with its answers, debuff, owner and whether it was answered
  findForAnswer(id: number) {
    return this.prismaService.roundQuestion.findUnique({
      where: { id },
      include: {
        questionBank: { include: { answers: true } },
        debuff: true,
        matchRoundParticipant: {
          select: { matchParticipant: { select: { userId: true } } }
        },
        roundQuestionsAnswerLogs: { select: { id: true }, take: 1 }
      }
    })
  }

  findAnswerLog(roundQuestionId: number) {
    return this.prismaService.roundQuestionsAnswerLog.findFirst({
      where: { roundQuestionId }
    })
  }

  updateAnswerLog(
    id: number,
    answer: {
      answerId: number
      timeAnswerMs: number
      isCorrect: boolean
      pointsEarned: number
    }
  ) {
    return this.prismaService.roundQuestionsAnswerLog.update({
      where: { id },
      data: answer
    })
  }

  createAnswerLog(
    roundQuestionId: number,
    answer: {
      answerId: number
      timeAnswerMs: number
      isCorrect: boolean
      pointsEarned: number
    }
  ) {
    return this.prismaService.roundQuestionsAnswerLog.create({
      data: { roundQuestionId, ...answer }
    })
  }

  findParticipantWithMatch(id: number) {
    return this.prismaService.matchRoundParticipant.findUnique({
      where: { id },
      include: {
        matchParticipant: { include: { user: true } },
        matchRound: {
          include: { match: { include: { participants: { include: { user: true } } } } }
        }
      }
    })
  }

  // The question after this one, with answers and debuff
  findNextQuestion(participantId: number, orderNumber: number) {
    return this.prismaService.roundQuestion.findFirst({
      where: {
        matchRoundParticipantId: participantId,
        orderNumber: { gt: orderNumber }
      },
      orderBy: { orderNumber: 'asc' },
      include: {
        questionBank: { include: { answers: true } },
        debuff: true
      }
    })
  }

  setQuestionEndTime(id: number, endTimeQuestion: Date) {
    return this.prismaService.roundQuestion.update({
      where: { id },
      data: { endTimeQuestion }
    })
  }

  // The question after this one, with answers (no debuff)
  findNextQuestionWithAnswers(participantId: number, orderNumber: number) {
    return this.prismaService.roundQuestion.findFirst({
      where: {
        matchRoundParticipantId: participantId,
        orderNumber: { gt: orderNumber }
      },
      orderBy: { orderNumber: 'asc' },
      include: {
        questionBank: { include: { answers: true } }
      }
    })
  }

  findAnswerLogsOfParticipant(participantId: number) {
    return this.prismaService.roundQuestionsAnswerLog.findMany({
      where: {
        roundQuestion: {
          matchRoundParticipantId: participantId
        }
      }
    })
  }

  completeParticipant(id: number, totalTimeMs: number, points: number) {
    return this.prismaService.matchRoundParticipant.update({
      where: { id },
      data: { totalTimeMs, points, status: 'COMPLETED' },
      include: { selectedUserPokemon: { include: { pokemon: true } }, debuff: true }
    })
  }

  findOpponentInRound(matchRoundId: number, opponentUserId: number) {
    return this.prismaService.matchRoundParticipant.findFirst({
      where: {
        matchRoundId,
        matchParticipant: {
          userId: opponentUserId
        }
      }
    })
  }

  findRoundWithPlayers(matchRoundId: number) {
    return this.prismaService.matchRound.findUnique({
      where: { id: matchRoundId },
      include: {
        participants: { include: { matchParticipant: { include: { user: true } } } }
      }
    })
  }

  // Questions this participant answered (timed-out ones have no answer)
  countAnswered(participantId: number) {
    return this.prismaService.roundQuestionsAnswerLog.count({
      where: {
        roundQuestion: {
          matchRoundParticipantId: participantId
        },
        answerId: { not: null } // Count only answered questions
      }
    })
  }

  completeRound(matchRoundId: number, winnerId: number | null) {
    return this.prismaService.matchRound.update({
      where: { id: matchRoundId },
      data: { status: 'COMPLETED', roundWinnerId: winnerId },
      include: {
        participants: {
          include: {
            matchParticipant: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                  }
                }
              }
            },
            selectedUserPokemon: {
              include: {
                pokemon: {
                  select: {
                    id: true,
                    pokedex_number: true,
                    nameJp: true,
                    nameTranslations: true,
                    rarity: true,
                    imageUrl: true
                  }
                }
              }
            }
          }
        },
        roundWinner: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        }
      }
    })
  }

  findRoundByNumber(matchId: number, nextRoundNumber: string) {
    return this.prismaService.matchRound.findFirst({
      where: { matchId, roundNumber: nextRoundNumber as any, deletedAt: null },
      include: {
        participants: {
          include: { matchParticipant: { include: { user: true } } },
          orderBy: { orderSelected: 'asc' }
        }
      }
    })
  }

  findRoundsOfMatch(matchId: number) {
    return this.prismaService.matchRound.findMany({
      where: { matchId, deletedAt: null },
      include: {
        roundWinner: { include: { user: true } },
        participants: { include: { matchParticipant: { include: { user: true } } } }
      },
      orderBy: { roundNumber: 'asc' }
    })
  }

  findParticipantWithUser(id: number) {
    return this.prismaService.matchParticipant.findUnique({
      where: { id },
      include: { user: true }
    })
  }

  countAnsweredInMatch(matchId: number, userId: number, prismaTx: PrismaClient) {
    return prismaTx.roundQuestionsAnswerLog.count({
      where: {
        roundQuestion: {
          matchRoundParticipant: {
            matchRound: {
              matchId
            },
            matchParticipant: {
              userId
            }
          }
        },
        answerId: { not: null }
      }
    })
  }

  // ---- Round flow when a question times out (RoundQuestionTimeoutProcessor) ----

  findWithAnswers(roundQuestionId: number) {
    return this.prismaService.roundQuestion.findUnique({
      where: { id: roundQuestionId },
      include: {
        questionBank: {
          include: {
            answers: true
          }
        },
        debuff: true
      }
    })
  }

  // ---- Questions made for a round (match-round-participant) ----

  createQuestionRow(data: Prisma.RoundQuestionUncheckedCreateInput) {
    return this.prismaService.roundQuestion.create({ data })
  }

  findQuestionsOfParticipant(participantId: number) {
    return this.prismaService.roundQuestion.findMany({
      where: { matchRoundParticipantId: participantId },
      orderBy: { orderNumber: 'asc' }
    })
  }

  setDebuffAndPoints(id: number, debuffId: number, basePoints: number) {
    return this.prismaService.roundQuestion.update({
      where: { id },
      data: { debuffId, basePoints }
    })
  }

  setDebuff(id: number, debuffId: number) {
    return this.prismaService.roundQuestion.update({ where: { id }, data: { debuffId } })
  }

  // ---- Questions for the pick timeout and round start ----

  countForParticipants(ids: number[]) {
    return this.prismaService.roundQuestion.count({
      where: { matchRoundParticipantId: { in: ids } }
    })
  }

  // The first question, with answers and debuff
  findFirstQuestion(participantId: number) {
    return this.prismaService.roundQuestion.findFirst({
      where: { matchRoundParticipantId: participantId },
      orderBy: { orderNumber: 'asc' },
      include: {
        questionBank: {
          include: {
            answers: true
          }
        },
        debuff: true
      }
    })
  }
}
