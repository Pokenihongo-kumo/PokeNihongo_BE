import { LanguagesService } from '@/modules/languages/languages.service'
import { LeaderboardSeasonService } from '@/modules/leaderboard-season/leaderboard-season.service'
import { QuestionBankService } from '@/modules/question-bank/question-bank.service'
import { NotFoundRecordException } from '@/shared/error'
import {
  addTimeUTC,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import {
  MatchAlreadyExistsException,
  NotHaveActiveLeaderboardSeasonException
} from './dto/match.error'
import { UpdateMatchBody } from './dto/match.zod-dto'
import { MatchRepo } from './match.repo'

@Injectable()
export class MatchService {
  constructor(
    private matchRepo: MatchRepo,
    private readonly languagesService: LanguagesService,
    private readonly leaderboardSeasonService: LeaderboardSeasonService,
    private readonly questionBankService: QuestionBankService
  ) {}

  async list(pagination: PaginationQuery, lang: string = 'vi') {
    const langId = await this.languagesService.getIdByCode(lang)
    const data = await this.matchRepo.list(pagination, langId ?? undefined)
    return data
  }

  async findById(id: number) {
    const match = await this.matchRepo.findById(id)
    if (!match) {
      throw new NotFoundRecordException()
    }

    return match
  }

  async create({ createdById }: { createdById: number }) {
    let createdMatch: any = null

    try {
      const leaderboardActive = await this.leaderboardSeasonService.findActiveSeason()
      if (!leaderboardActive) {
        throw new NotHaveActiveLeaderboardSeasonException()
      }
      return await this.matchRepo.withTransaction(async (prismaTx) => {
        const result = await this.matchRepo.create(
          {
            createdById,
            data: {
              leaderboardSeasonId: leaderboardActive.id
            }
          },
          prismaTx
        )

        return result
      })
    } catch (error) {
      // Rollback: Delete match if created
      if (createdMatch?.id) {
        try {
          await this.matchRepo.delete(
            {
              id: createdMatch.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new MatchAlreadyExistsException()
      }
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async update({
    id,
    data,
    updatedById
  }: {
    id: number
    data: UpdateMatchBody
    updatedById: number
  }) {
    let existingMatch: any = null

    try {
      return await this.matchRepo.withTransaction(async (prismaTx) => {
        existingMatch = await this.matchRepo.findById(id)
        if (!existingMatch) {
          throw new NotFoundRecordException()
        }
        const updatedMatch = await this.matchRepo.update(
          {
            id,
            updatedById,
            data
          },
          prismaTx
        )

        return updatedMatch
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new MatchAlreadyExistsException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      return
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async getTrackingMatch(userId: number, lang: string = 'vi') {
    // 1) Auto-find the user's active match by status (prefer IN_PROGRESS, then PENDING)
    const match: any = await this.matchRepo.findCurrentMatchForUser(userId)

    if (!match) {
      return {
        type: 'NO_ACTIVE_MATCH',
        matchId: null,
        match: null
      }
    }

    const participants = (match?.participants ?? []) as any[]
    const me = participants.find((p: any) => p.userId === userId)
    const opp = participants.find((p: any) => p.userId !== userId)

    if (!me || !opp) {
      // Should not happen for a valid PvP match
      throw new NotFoundRecordException()
    }

    // 2) If PENDING -> MATCH_FOUND payload
    if (match.status === 'PENDING') {
      // Accept window: assume 25s from createdAt (adjust if your system uses different window)
      const createdAt = new Date(match.createdAt as any)
      const endTime = addTimeUTC(createdAt, 25_000).toISOString()
      return {
        type: 'MATCH_FOUND',
        matchId: match.id,
        match: {
          id: match.id,
          status: match.status,
          createdAt: createdAt.toISOString(),
          endTime
        },
        opponent: opp?.user
          ? {
              id: opp.user.id,
              name: opp.user.name,
              avatar: opp.user.avatar
            }
          : null,
        participant: {
          id: me.id,
          hasAccepted: (me as any).hasAccepted ?? null,
          userId: (me as any).userId,
          matchId: match.id
        }
      }
    }

    // 3) IN_PROGRESS -> determine current round and state
    if (match.status === 'IN_PROGRESS') {
      // Sort rounds by id (creation order) to ensure correct round sequence
      const rounds = (match.rounds || []).filter((r: any) => r.status !== 'COMPLETED')
      // Find the first round that is not COMPLETED and whose status is not null
      const currentRound: any = rounds.length > 0 ? rounds[0] : null

      if (!currentRound) {
        return {
          type: 'BETWEEN_ROUNDS',
          matchId: match.id,
          match: { id: match.id, status: match.status }
        }
      }

      const myRoundP = (currentRound.participants as any[]).find(
        (p: any) => p.matchParticipant.userId === userId
      )
      const oppRoundP = (currentRound.participants as any[]).find(
        (p: any) => p.matchParticipant.userId !== userId
      )

      if (!myRoundP) {
        return {
          type: 'BETWEEN_ROUNDS',
          matchId: match.id,
          match: { id: match.id, status: match.status }
        }
      }

      // Selecting Pokemon phase
      if (
        currentRound.status === 'SELECTING_POKEMON' ||
        myRoundP?.status === 'SELECTING_POKEMON'
      ) {
        // Add timeLimitMs for selecting pokemon
        const TIME_CHOOSE_POKEMON_MS = 5000
        return {
          type: 'ROUND_SELECTING_POKEMON',
          matchId: match.id,
          round: {
            id: currentRound.id,
            roundNumber: currentRound.roundNumber,
            status: currentRound.status,
            participant: {
              id: myRoundP.id,
              status: myRoundP.status,
              selectedUserPokemon: myRoundP.selectedUserPokemon,
              debuff: myRoundP.debuff || null
            },
            opponent: oppRoundP
              ? {
                  id: oppRoundP.id,
                  status: oppRoundP.status,
                  selectedUserPokemon: oppRoundP.selectedUserPokemon,
                  debuff: oppRoundP.debuff || null,
                  user: opp?.user
                    ? { id: opp.user.id, name: opp.user.name, avatar: opp.user.avatar }
                    : null
                }
              : null
          },
          selectionEndTime: myRoundP?.endTimeSelected
            ? new Date(myRoundP.endTimeSelected as any).toISOString()
            : null,
          timeLimitMs: TIME_CHOOSE_POKEMON_MS
        }
      }

      // Round starting (pending)
      if (currentRound.status === 'PENDING') {
        // If you persist a startTime, map it here; otherwise null
        const startTime = null as any
        return {
          type: 'ROUND_STARTING',
          matchId: match.id,
          round: {
            id: currentRound.id,
            roundNumber: currentRound.roundNumber,
            status: currentRound.status,
            participant: {
              id: myRoundP.id,
              status: myRoundP.status,
              selectedUserPokemon: myRoundP.selectedUserPokemon,
              debuff: myRoundP.debuff || null
            },
            opponent: oppRoundP
              ? {
                  id: oppRoundP.id,
                  status: oppRoundP.status,
                  selectedUserPokemon: oppRoundP.selectedUserPokemon,
                  debuff: oppRoundP.debuff || null,
                  user: opp?.user
                    ? { id: opp.user.id, name: opp.user.name, avatar: opp.user.avatar }
                    : null
                }
              : null
          },
          startTime
        }
      }

      // Round in progress -> return only current question
      if (currentRound.status === 'IN_PROGRESS') {
        const myRqs = ((myRoundP as any).roundQuestions || []).sort(
          (a: any, b: any) => a.orderNumber - b.orderNumber
        )
        const currentRq = myRqs.find(
          (rq: any) =>
            !rq.roundQuestionsAnswerLogs || rq.roundQuestionsAnswerLogs.length === 0
        )

        let currentQuestion: any = null
        if (currentRq) {
          // Prefer canonical formatting via repository; fallback to included questionBank
          try {
            const qbList = await this.questionBankService.getByIds(
              [currentRq.questionBankId],
              lang
            )
            const canonical: any = qbList?.[0]
            const endTime = currentRq.endTimeQuestion
              ? new Date(currentRq.endTimeQuestion as any).toISOString()
              : addTimeUTC(new Date(), currentRq.timeLimitMs).toISOString()
            currentQuestion = {
              id: canonical?.id ?? currentRq.questionBankId,
              questionType:
                canonical?.questionType ??
                currentRq.questionBank?.questionType ??
                'VOCABULARY',
              audioUrl: canonical?.audioUrl ?? currentRq.questionBank?.audioUrl ?? null,
              pronunciation:
                canonical?.pronunciation ?? currentRq.questionBank?.pronunciation ?? null,
              levelN: canonical?.levelN ?? currentRq.questionBank?.levelN ?? null,
              question:
                canonical?.question ??
                (currentRq.questionBank as any)?.question ??
                (currentRq.questionBank as any)?.questionJp ??
                '',
              answers: (
                (canonical?.answers as any[]) ??
                ((currentRq.questionBank as any)?.answers as any[]) ??
                []
              ).map((a: any) => ({
                id: a.id,
                answer: a.answer ?? a.answerJp ?? a.answerKey ?? ''
              })),
              endTimeQuestion: endTime,
              debuff: currentRq.debuff || null,
              // round meta
              roundQuestionId: currentRq.id,
              timeLimitMs: currentRq.timeLimitMs,
              basePoints: currentRq.basePoints,
              orderNumber: currentRq.orderNumber
            }
          } catch (_) {
            // Fallback if repository fails
            const qb = currentRq.questionBank
            const endTime = currentRq.endTimeQuestion
              ? new Date(currentRq.endTimeQuestion as any).toISOString()
              : addTimeUTC(new Date(), currentRq.timeLimitMs).toISOString()
            currentQuestion = {
              id: qb?.id ?? currentRq.questionBankId,
              questionType: qb?.questionType ?? 'VOCABULARY',
              audioUrl: qb?.audioUrl ?? null,
              pronunciation: qb?.pronunciation ?? null,
              levelN: qb?.levelN ?? null,
              question: (qb as any)?.question ?? (qb as any)?.questionJp ?? '',
              answers: ((qb?.answers as any[]) ?? []).map((a: any) => ({
                id: a.id,
                answer: a.answer ?? a.answerJp ?? a.answerKey ?? ''
              })),
              endTimeQuestion: endTime,
              debuff: currentRq.debuff || null,
              roundQuestionId: currentRq.id,
              timeLimitMs: currentRq.timeLimitMs,
              basePoints: currentRq.basePoints,
              orderNumber: currentRq.orderNumber
            }
          }
        }

        return {
          type: 'ROUND_IN_PROGRESS',
          matchId: match.id,
          round: {
            id: currentRound.id,
            roundNumber: currentRound.roundNumber,
            status: currentRound.status,
            participant: {
              id: (myRoundP as any).id,
              status: (myRoundP as any).status,
              selectedUserPokemon: (myRoundP as any).selectedUserPokemon,
              debuff: (myRoundP as any).debuff || null
            },
            opponent: oppRoundP
              ? {
                  id: oppRoundP.id,
                  status: oppRoundP.status,
                  selectedUserPokemon: oppRoundP.selectedUserPokemon,
                  debuff: oppRoundP.debuff || null,
                  user: opp?.user
                    ? { id: opp.user.id, name: opp.user.name, avatar: opp.user.avatar }
                    : null
                }
              : null
          },
          currentQuestion
        }
      }
    }

    // 4) Default/fallback (e.g., CANCELLED or COMPLETED, though controller should avoid)
    return {
      type: 'NO_ACTIVE_MATCH',
      matchId: match.id,
      match: { id: match.id, status: match.status }
    }
  }

  // ---- For other modules (module-boundary plan B6) ----
  // Same arguments and results as the repo methods.

  // The repo's update (the service's own update answers the HTTP route)
  updateMatch(...args: Parameters<MatchRepo['update']>) {
    return this.matchRepo.update(...args)
  }

  // The repo's create (the service's own create answers the HTTP route)
  createMatch(...args: Parameters<MatchRepo['create']>) {
    return this.matchRepo.create(...args)
  }

  findActiveMatchByUserId(...args: Parameters<MatchRepo['findActiveMatchByUserId']>) {
    return this.matchRepo.findActiveMatchByUserId(...args)
  }

  checkUserHasJoinedSeason(...args: Parameters<MatchRepo['checkUserHasJoinedSeason']>) {
    return this.matchRepo.checkUserHasJoinedSeason(...args)
  }

  findInProgressByUserId(...args: Parameters<MatchRepo['findInProgressByUserId']>) {
    return this.matchRepo.findInProgressByUserId(...args)
  }

  findByIdWithParticipant(...args: Parameters<MatchRepo['findByIdWithParticipant']>) {
    return this.matchRepo.findByIdWithParticipant(...args)
  }

  getMatchWithRoundsByUserId(
    ...args: Parameters<MatchRepo['getMatchWithRoundsByUserId']>
  ) {
    return this.matchRepo.getMatchWithRoundsByUserId(...args)
  }

  countMatchesByUserId(...args: Parameters<MatchRepo['countMatchesByUserId']>) {
    return this.matchRepo.countMatchesByUserId(...args)
  }

  countWinsByUserId(...args: Parameters<MatchRepo['countWinsByUserId']>) {
    return this.matchRepo.countWinsByUserId(...args)
  }

  getMatchesByUser(...args: Parameters<MatchRepo['getMatchesByUser']>) {
    return this.matchRepo.getMatchesByUser(...args)
  }

  getMatchesHistoryByUser(...args: Parameters<MatchRepo['getMatchesHistoryByUser']>) {
    return this.matchRepo.getMatchesHistoryByUser(...args)
  }

  setStatus(...args: Parameters<MatchRepo['setStatus']>) {
    return this.matchRepo.setStatus(...args)
  }

  // ---- For other modules: Completing a match (RoundQuestionService) (B7) ----

  findStatusById(...args: Parameters<MatchRepo['findStatusById']>) {
    return this.matchRepo.findStatusById(...args)
  }

  completeWithWinner(...args: Parameters<MatchRepo['completeWithWinner']>) {
    return this.matchRepo.completeWithWinner(...args)
  }

  setEloResult(...args: Parameters<MatchRepo['setEloResult']>) {
    return this.matchRepo.setEloResult(...args)
  }

  findCompletedWithDetails(...args: Parameters<MatchRepo['findCompletedWithDetails']>) {
    return this.matchRepo.findCompletedWithDetails(...args)
  }

  // ---- For other modules: The pick flow (match-round-participant) (B7) ----

  findWithPlayers(...args: Parameters<MatchRepo['findWithPlayers']>) {
    return this.matchRepo.findWithPlayers(...args)
  }

  // ---- For other modules: The pick timeout (match-round-participant) (B7) ----

  findInProgressByParticipant(
    ...args: Parameters<MatchRepo['findInProgressByParticipant']>
  ) {
    return this.matchRepo.findInProgressByParticipant(...args)
  }

  findByRoundWithPlayers(...args: Parameters<MatchRepo['findByRoundWithPlayers']>) {
    return this.matchRepo.findByRoundWithPlayers(...args)
  }
}
