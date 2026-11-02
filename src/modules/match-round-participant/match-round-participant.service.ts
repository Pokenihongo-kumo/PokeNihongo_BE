import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import {
  MatchRoundNumber,
  MatchRoundParticipantStatus,
  RoundStatus
} from '@/common/constants/match.constant'
import { I18nService } from '@/i18n/i18n.service'
import { MatchingSocketMessage, MatchRoundParticipantMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  addTimeUTC,
  convertEloToRank,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { Queue } from 'bull'
import { PrismaService } from 'src/shared/services/prisma.service'
import { MatchingGateway } from 'src/websockets/matching.gateway'
import { MatchRoundRepo } from '../match-round/match-round.repo'
import { PokemonRepo } from '../pokemon/pokemon.repo'
import { QuestionBankRepository } from '../question-bank/question-bank.repo'
import { UserPokemonRepo } from '../user-pokemon/user-pokemon.repo'
import {
  MatchRoundParticipantNotFoundException,
  PokemonSelectionExpiredException
} from './dto/match-round-participant.error'
import {
  ChoosePokemonMatchRoundParticipantBodyType,
  CreateMatchRoundParticipantBodyType,
  UpdateMatchRoundParticipantBodyType
} from './entities/match-round-participant.entity'
import { MatchRoundParticipantRepo } from './match-round-participant.repo'

const TIME_CHOOSE_POKEMON_MS = 5000
const TIME_LIMIT_ANSWER_QUESTION_MS = 5000
const QUESTIONS_PER_ROUND = 5
@Injectable()
export class MatchRoundParticipantService {
  private readonly logger = new Logger(MatchRoundParticipantService.name)

  constructor(
    private matchRoundParticipantRepo: MatchRoundParticipantRepo,
    private readonly matchRoundRepo: MatchRoundRepo,
    private readonly userPokemonRepo: UserPokemonRepo,
    private readonly questionBankRepo: QuestionBankRepository,
    private readonly pokemonRepo: PokemonRepo,
    private readonly i18nService: I18nService,
    private readonly prismaService: PrismaService,
    private readonly matchingGateway: MatchingGateway,
    @InjectQueue(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
    private readonly matchRoundParticipantTimeoutQueue: Queue
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.matchRoundParticipantRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(
        MatchRoundParticipantMessage.GET_LIST_SUCCESS,
        lang
      )
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const matchRoundParticipant = await this.matchRoundParticipantRepo.findById(id)
    if (!matchRoundParticipant) {
      throw new MatchRoundParticipantNotFoundException()
    }

    return {
      statusCode: 200,
      data: matchRoundParticipant,
      message: this.i18nService.translate(
        MatchRoundParticipantMessage.GET_LIST_SUCCESS,
        lang
      )
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateMatchRoundParticipantBodyType },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.matchRoundParticipantRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(
          MatchRoundParticipantMessage.CREATE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
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

  async update(
    {
      id,
      data,
      userId
    }: {
      id: number
      data: UpdateMatchRoundParticipantBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      //check coi thang user nay co pity nao dang pending ko, co thi ko dc tao them
      const existingPity = await this.matchRoundParticipantRepo.findById(id)
      if (!existingPity) {
        throw new MatchRoundParticipantNotFoundException()
      }

      const matchRoundParticipant = await this.matchRoundParticipantRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: matchRoundParticipant,
        message: this.i18nService.translate(
          MatchRoundParticipantMessage.UPDATE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new MatchRoundParticipantNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async choosePokemonWithRound(
    {
      matchRoundId,
      userId,
      data
    }: {
      matchRoundId: number
      userId: number
      data: ChoosePokemonMatchRoundParticipantBodyType
    },
    lang: string = 'vi'
  ) {
    try {
      // Dựa vào matchRoundId lấy ra match-round kèm match và participants
      const existMatchRound =
        await this.matchRoundRepo.findByIdWithMatchAndParticipants(matchRoundId)
      if (!existMatchRound) {
        throw new MatchRoundParticipantNotFoundException()
      }

      // Tìm match-participant phù hợp với userId trong match
      const matchParticipant = existMatchRound.match.participants.find(
        (p) => p.userId === userId
      )
      if (!matchParticipant) {
        throw new NotFoundRecordException()
      }

      // Tìm match-round-participant tương ứng
      const existMatchRoundParticipant =
        await this.matchRoundParticipantRepo.findByMatchRoundIdAndUserId(
          matchRoundId,
          userId
        )
      if (!existMatchRoundParticipant) {
        throw new MatchRoundParticipantNotFoundException()
      }

      // CRITICAL: Check if participant already selected Pokemon (auto-selected by timeout)
      if (existMatchRoundParticipant.selectedUserPokemonId !== null) {
        this.logger.warn(
          `[MatchRoundParticipant] User ${userId} tried to select Pokemon after timeout (already selected: ${existMatchRoundParticipant.selectedUserPokemonId})`
        )

        // Notify user via socket that selection expired
        this.matchingGateway.notifyPokemonSelectionExpired(
          existMatchRound.match.id,
          matchRoundId,
          userId,
          MatchingSocketMessage.TIMOUT_SELECTED_POKEMON
        )

        throw new PokemonSelectionExpiredException()
      }

      // Tìm userPokemon dựa vào pokemonId và userId
      const userPokemon = await this.userPokemonRepo.findByUserAndPokemon(
        userId,
        data.pokemonId
      )
      if (!userPokemon) {
        throw new NotFoundRecordException()
      }

      // ✅ CRITICAL FIX: Remove ALL timeout jobs for this participant (including active ones)
      // Must remove ALL instances, not just first match, to prevent duplicate question generation
      const jobs = await this.matchRoundParticipantTimeoutQueue.getJobs([
        'waiting',
        'delayed',
        'active' // ← Include active jobs to catch jobs currently being processed
      ])

      // Get all participant IDs in this round
      const roundParticipantIds = existMatchRound.participants.map((p) => p.id)

      // Filter for CHECK_POKEMON_SELECTION_TIMEOUT jobs only
      const jobsToRemove = jobs.filter(
        (job) =>
          roundParticipantIds.includes(job.data?.matchRoundParticipantId) &&
          job.name === BullAction.CHECK_POKEMON_SELECTION_TIMEOUT
      )

      if (jobsToRemove.length > 0) {
        this.logger.log(
          `[MatchRoundParticipant] ✂️ Removing ${jobsToRemove.length} timeout jobs for round ${matchRoundId} (user ${userId} selected manually)`
        )
        await Promise.all(jobsToRemove.map((job) => job.remove()))
      } else {
        this.logger.log(
          `[MatchRoundParticipant] No timeout jobs found to remove for round ${matchRoundId}`
        )
      }

      // Update selectedUserPokemonId với userPokemon.id
      const matchRoundParticipant = await this.matchRoundParticipantRepo.update({
        id: existMatchRoundParticipant.id,
        data: {
          selectedUserPokemonId: userPokemon.id,
          status: MatchRoundParticipantStatus.PENDING // chuyển ngay participant này sang PENDING
        },
        updatedById: userId
      })

      // ✅ CRITICAL FIX: Re-fetch participants from DB to ensure accurate allSelected check
      // Do NOT rely on stale in-memory data from existMatchRound.participants
      const freshParticipants = await this.prismaService.matchRoundParticipant.findMany({
        where: { matchRoundId, deletedAt: null },
        orderBy: { orderSelected: 'asc' }
      })

      const allSelectedNow = freshParticipants.every(
        (p) => p.selectedUserPokemonId !== null
      )

      this.logger.log(
        `[MatchRoundParticipant] After user ${userId} selected: allSelected=${allSelectedNow}, participants=${freshParticipants.map((p) => `${p.id}:${p.selectedUserPokemonId ? '✅' : '❌'}`).join(', ')}`
      )

      const currentIndex = freshParticipants.findIndex(
        (p) => p.id === existMatchRoundParticipant.id
      )
      const nextParticipant = freshParticipants[currentIndex + 1]
      const nextEndTime = addTimeUTC(new Date(), TIME_CHOOSE_POKEMON_MS)
      if (allSelectedNow) {
        this.logger.log(
          `[MatchRoundParticipant] All participants selected manually in round ${matchRoundId}. Updating statuses then generating questions.`
        )
        // Update round & participants to PENDING trước khi notify
        await this.prismaService.matchRound.update({
          where: { id: matchRoundId },
          data: { status: RoundStatus.PENDING }
        })
        await this.prismaService.matchRoundParticipant.updateMany({
          where: { matchRoundId },
          data: { status: RoundStatus.PENDING }
        })
      } else if (nextParticipant) {
        // Nếu chưa all selected và có nextParticipant -> Set time cho participant tiếp theo
        await this.matchRoundParticipantRepo.update({
          id: nextParticipant.id,
          data: {
            endTimeSelected: nextEndTime
          }
        })

        // Tạo Bull job cho participant tiếp theo
        await this.matchRoundParticipantTimeoutQueue.add(
          BullAction.CHECK_POKEMON_SELECTION_TIMEOUT,
          {
            matchRoundParticipantId: nextParticipant.id
          },
          {
            delay: TIME_CHOOSE_POKEMON_MS
          }
        )
        this.logger.log(
          `[MatchRoundParticipant] Set endTime and Bull job for next participant ${nextParticipant.id}`
        )
      }

      // Fetch data và gửi socket 1 lần duy nhất SAU khi tất cả hàm chạy xong
      const match: any = await this.prismaService.match.findUnique({
        where: { id: existMatchRound.match.id },
        include: { participants: { include: { user: true } } }
      })
      const rounds: any[] = await this.prismaService.matchRound.findMany({
        where: { matchId: existMatchRound.match.id, deletedAt: null },
        include: {
          participants: {
            include: {
              selectedUserPokemon: { include: { pokemon: true } }
            }
          }
        },
        orderBy: { roundNumber: 'asc' }
      })

      const matchFormatted = {
        id: match.id,
        status: match.status,
        participants: match.participants.map((mp: any) => ({
          id: mp.id,
          userId: mp.userId,
          user: {
            id: mp.user.id,
            name: mp.user.name,
            email: mp.user.email,
            eloscore: mp.user.eloscore,
            avatar: mp.user.avatar
          }
        }))
      }
      const roundsFormatted = rounds.map((round: any) => ({
        id: round.id,
        roundNumber: round.roundNumber,
        status: round.status,
        endTimeRound: round.endTimeRound,
        participants: round.participants.map((rp: any) => ({
          id: rp.id,
          matchParticipantId: rp.matchParticipantId,
          orderSelected: rp.orderSelected,
          endTimeSelected: rp.endTimeSelected,
          selectedUserPokemonId: rp.selectedUserPokemonId,
          selectedUserPokemon: rp.selectedUserPokemon
            ? {
                id: rp.selectedUserPokemon.id,
                userId: rp.selectedUserPokemon.userId,
                pokemonId: rp.selectedUserPokemon.pokemonId,
                pokemon: rp.selectedUserPokemon.pokemon
                  ? {
                      id: rp.selectedUserPokemon.pokemon.id,
                      pokedex_number: rp.selectedUserPokemon.pokemon.pokedex_number,
                      nameJp: rp.selectedUserPokemon.pokemon.nameJp,
                      nameTranslations: rp.selectedUserPokemon.pokemon.nameTranslations,
                      imageUrl: rp.selectedUserPokemon.pokemon.imageUrl,
                      rarity: rp.selectedUserPokemon.pokemon.rarity
                    }
                  : null
              }
            : null
        }))
      }))

      this.matchingGateway.notifyPokemonSelected(
        existMatchRound.match.id,
        matchRoundId,
        { match: matchFormatted, rounds: roundsFormatted },
        null,
        null,
        TIME_CHOOSE_POKEMON_MS
      )
      // Nếu all selected -> generate questions + debuff + moveToNextRound TRƯỚC khi fetch & socket
      if (allSelectedNow) {
        await this.handleQuestionsAndDebuffForCompletedSelection(
          existMatchRound,
          freshParticipants.map((p) => p.id)
        )

        // CRITICAL: Only check allPending when BOTH users have selected
        // This prevents premature round starting when only one user selected
        const allRounds = await this.prismaService.matchRound.findMany({
          where: { matchId: existMatchRound.match.id, deletedAt: null },
          include: { participants: true }
        })
        const allPending = allRounds.every((r) => r.status === RoundStatus.PENDING)

        this.logger.log(
          `[MatchRoundParticipant] AllPending check (after both selected): ${allPending}, Total rounds: ${allRounds.length}`
        )

        if (allPending) {
          const roundOne = allRounds.find((r) => r.roundNumber === MatchRoundNumber.ONE)
          if (roundOne) {
            // ✅ FIX BUG 1: Check if START_ROUND job already exists to prevent duplicate ROUND_STARTING
            const existingJobs = await this.matchRoundParticipantTimeoutQueue.getJobs([
              'waiting',
              'delayed'
            ])
            const hasStartRoundJob = existingJobs.some(
              (job) =>
                job.name === BullAction.START_ROUND &&
                job.data?.matchId === existMatchRound.match.id &&
                job.data?.matchRoundId === roundOne.id
            )

            if (!hasStartRoundJob) {
              // ✅ GUARD: Check if round already IN_PROGRESS to prevent duplicate notifications
              if (roundOne.status === 'IN_PROGRESS') {
                this.logger.warn(
                  `[MatchRoundParticipant] Round ONE already IN_PROGRESS for match ${existMatchRound.match.id}, skipping notifyRoundStarting`
                )
                return
              }

              const roundOneParticipants =
                await this.prismaService.matchRoundParticipant.findMany({
                  where: { matchRoundId: roundOne.id, deletedAt: null },
                  include: { matchParticipant: { include: { user: true } } },
                  orderBy: { orderSelected: 'asc' }
                })
              if (roundOneParticipants.length === 2) {
                const userId1 = roundOneParticipants[0].matchParticipant.userId
                const userId2 = roundOneParticipants[1].matchParticipant.userId
                this.matchingGateway.notifyRoundStarting(
                  existMatchRound.match.id,
                  userId1,
                  userId2,
                  'ONE',
                  5
                )
                await this.matchRoundParticipantTimeoutQueue.add(
                  BullAction.START_ROUND,
                  { matchId: existMatchRound.match.id, matchRoundId: roundOne.id },
                  { delay: 5000 }
                )
                this.logger.log(
                  `[MatchRoundParticipant] Scheduled Round ONE to start in 5 seconds for match ${existMatchRound.match.id}`
                )
              }
            } else {
              this.logger.warn(
                `[MatchRoundParticipant] START_ROUND job already exists for match ${existMatchRound.match.id}, round ${roundOne.id} - skipping duplicate`
              )
            }
          }
        }
      }
      return {
        statusCode: 200,
        data: matchRoundParticipant,
        message: this.i18nService.translate(
          MatchRoundParticipantMessage.UPDATE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new MatchRoundParticipantNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existMatchRoundParticipant = await this.matchRoundParticipantRepo.findById(id)
      if (!existMatchRoundParticipant) {
        throw new MatchRoundParticipantNotFoundException()
      }

      await this.matchRoundParticipantRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(
          MatchRoundParticipantMessage.DELETE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new MatchRoundParticipantNotFoundException()
      }
      throw error
    }
  }

  /**
   * Chuyển sang round tiếp theo khi round hiện tại đã hoàn thành
   */
  private async moveToNextRound(currentMatchRound: any): Promise<void> {
    try {
      // Cập nhật status của round hiện tại thành PENDING
      await this.prismaService.matchRound.update({
        where: { id: currentMatchRound.id },
        data: {
          status: RoundStatus.PENDING
        }
      })

      const nextRoundMap = {
        [MatchRoundNumber.ONE]: MatchRoundNumber.TWO,
        [MatchRoundNumber.TWO]: MatchRoundNumber.THREE,
        [MatchRoundNumber.THREE]: null
      }

      const nextRoundNumber = nextRoundMap[currentMatchRound.roundNumber]

      if (!nextRoundNumber) {
        this.logger.log(
          `Match ${currentMatchRound.matchId} has completed all rounds (Round THREE finished)`
        )
        return
      }

      // Tìm round tiếp theo
      const nextRound = await this.matchRoundRepo.findByMatchIdAndRoundNumber(
        currentMatchRound.matchId,
        nextRoundNumber
      )

      if (!nextRound) {
        this.logger.warn(
          `Next round ${nextRoundNumber} not found for match ${currentMatchRound.matchId}`
        )
        return
      }

      // Lấy participants của round tiếp theo
      const nextRoundParticipants = await this.matchRoundParticipantRepo.findMany({
        where: {
          matchRoundId: nextRound.id,
          deletedAt: null
        },
        orderBy: {
          orderSelected: 'asc'
        }
      })

      const firstParticipant = nextRoundParticipants[0]

      if (firstParticipant) {
        // Set endTimeSelected
        await this.matchRoundParticipantRepo.update({
          id: firstParticipant.id,
          data: {
            endTimeSelected: addTimeUTC(new Date(), TIME_CHOOSE_POKEMON_MS) // 30 seconds
          }
        })

        // Tạo Bull job
        await this.matchRoundParticipantTimeoutQueue.add(
          BullAction.CHECK_POKEMON_SELECTION_TIMEOUT,
          {
            matchRoundParticipantId: firstParticipant.id
          },
          {
            delay: TIME_CHOOSE_POKEMON_MS // 30 seconds
          }
        )

        this.logger.log(
          `Moved to round ${nextRoundNumber} - Set endTime and Bull job for participant ${firstParticipant.id}`
        )
      }
    } catch (error) {
      this.logger.error(
        `Error moving to next round for match ${currentMatchRound.matchId}`,
        error
      )
    }
  }

  /**
   * Khi cả round đã chọn xong Pokemon: tạo 10 câu hỏi giống nhau cho cả 2 participants, áp dụng debuff, rồi auto start Round ONE nếu tất cả rounds PENDING.
   */
  private async handleQuestionsAndDebuffForCompletedSelection(
    matchRoundWithParticipants: any,
    matchRoundParticipantIds: number[]
  ) {
    try {
      const matchId = matchRoundWithParticipants.match.id
      const roundId = matchRoundWithParticipants.id
      const participants = matchRoundWithParticipants.match.participants

      // Lấy user ELO cho mỗi participant qua bảng user
      const users = await this.prismaService.user.findMany({
        where: { id: { in: participants.map((p) => p.userId) } },
        select: { id: true, eloscore: true }
      })
      const eloMap = new Map(users.map((u) => [u.id, u.eloscore || 0]))

      const participantElos = participants.map((p) => eloMap.get(p.userId) || 0)
      const avgElo = participantElos.reduce((a, b) => a + b, 0) / participantElos.length

      // Determine ranks
      const ranks = participants.map((p) => ({
        participantId: p.id,
        userId: p.userId,
        rank: convertEloToRank(eloMap.get(p.userId) || 0)
      }))
      const distinctRanks: string[] = Array.from(
        new Set(ranks.map((r) => r.rank))
      ) as string[]

      // Helper: map rank to levelN field (assume same naming)
      const sortedRanks = distinctRanks
        .filter((r) => r && r !== 'Unranked')
        .sort() as string[]
      const baseRank: string | undefined = sortedRanks[0]
      let higherRank: string | null = null
      if (sortedRanks.length > 1) {
        higherRank = sortedRanks[1] || null
      }

      // Lấy 10 câu hỏi: nếu cùng rank -> toàn bộ lấy theo rank đó
      // Nếu khác rank -> tính phần trăm cho rank cao hơn dựa vào avgElo vượt ngưỡng rank thấp
      let higherPercent = 0
      if (higherRank) {
        // Lấy maxElo của rank thấp hơn từ convertEloToRank thresholds (hardcode tạm)
        const rankThresholds = [
          { rank: 'N5', maxElo: 1000 },
          { rank: 'N4', maxElo: 2000 },
          { rank: 'N3', maxElo: 3000 }
        ]
        const lowMax = rankThresholds.find((t) => t.rank === baseRank)?.maxElo || 0
        const diff = Math.max(0, avgElo - lowMax)
        const rawPercent = Math.floor(diff / 10) // 277 -> 27
        higherPercent = Math.min(50, Math.max(10, Math.floor(rawPercent / 10) * 10)) // tens rounding (27 -> 20)
      }

      const totalQuestions = QUESTIONS_PER_ROUND
      const higherCount = higherRank
        ? Math.round((totalQuestions * higherPercent) / 100)
        : 0
      const baseCount = totalQuestions - higherCount

      // Helper: map rank to levelN field
      const rankToLevel = (rank?: string | null): number | undefined => {
        if (!rank) return undefined
        if (rank.startsWith('N')) {
          const n = parseInt(rank.substring(1), 10)
          return isNaN(n) ? undefined : n
        }
        return undefined
      }

      // Use QuestionBankRepository to fetch random questions
      const baseLevelN = rankToLevel(baseRank)
      const finalBase = baseLevelN
        ? await this.questionBankRepo.getRandomQuestions(baseCount, baseLevelN)
        : []

      let finalHigher: any[] = []
      if (higherCount > 0 && higherRank) {
        const higherLevelN = rankToLevel(higherRank)
        if (higherLevelN) {
          finalHigher = await this.questionBankRepo.getRandomQuestions(
            higherCount,
            higherLevelN
          )
        }
      }

      const combined = [...finalBase, ...finalHigher].sort(() => Math.random() - 0.5)

      // Bulk create for each participant with identical order & points
      for (const participantId of matchRoundParticipantIds) {
        let orderNumber = 1
        for (const q of combined) {
          await this.prismaService.roundQuestion.create({
            data: {
              matchRoundParticipantId: participantId,
              questionBankId: q.id,
              timeLimitMs: TIME_LIMIT_ANSWER_QUESTION_MS,
              basePoints: 100,
              orderNumber: orderNumber
            }
          })
          orderNumber++
        }
      }

      await this.prismaService.matchRoundParticipant.updateMany({
        where: { id: { in: matchRoundParticipantIds } },
        data: { questionsTotal: combined.length }
      })

      // Debuff logic: xác định pokemon bị debuff -> participant chứa pokemon đó
      const selectedPokemons = await this.prismaService.matchRoundParticipant.findMany({
        where: { matchRoundId: roundId, deletedAt: null },
        select: { id: true, selectedUserPokemon: { select: { pokemonId: true } } }
      })
      if (selectedPokemons.length === 2) {
        const [p1, p2] = selectedPokemons
        if (p1.selectedUserPokemon?.pokemonId && p2.selectedUserPokemon?.pokemonId) {
          try {
            const debuffResult = await this.prismaService.debuffRound.findMany({
              where: { deletedAt: null },
              take: 50
            })
            const debuffRow = debuffResult.length
              ? debuffResult[Math.floor(Math.random() * debuffResult.length)]
              : null

            // Use PokemonRepo to calculate debuffed pokemon accurately
            let debuffedParticipantId: number | null = null
            try {
              const debuffCalc = await this.pokemonRepo.calculateDebuffedPokemon(
                p1.selectedUserPokemon.pokemonId,
                p2.selectedUserPokemon.pokemonId
              )
              const debuffedPokemonId = debuffCalc.debuffedPokemonId
              // Find which participant has the debuffed pokemon
              if (p1.selectedUserPokemon.pokemonId === debuffedPokemonId) {
                debuffedParticipantId = p1.id
              } else if (p2.selectedUserPokemon.pokemonId === debuffedPokemonId) {
                debuffedParticipantId = p2.id
              }
            } catch (calcError) {
              this.logger.warn(`Failed to calculate debuff pokemon: ${calcError.message}`)
              // Fallback to simple heuristic
              if (p1.selectedUserPokemon.pokemonId < p2.selectedUserPokemon.pokemonId) {
                debuffedParticipantId = p1.id
              } else {
                debuffedParticipantId = p2.id
              }
            }

            if (debuffRow && debuffedParticipantId) {
              // Persist debuff assignment on the participant (so later includes expose participant.debuff)
              try {
                await this.prismaService.matchRoundParticipant.update({
                  where: { id: debuffedParticipantId },
                  data: { debuffId: debuffRow.id, questionsTotal: QUESTIONS_PER_ROUND }
                })
              } catch (assignErr) {
                this.logger.warn(
                  `[MatchRoundParticipant] Failed to assign debuffId=${debuffRow.id} to participant ${debuffedParticipantId}: ${assignErr.message}`
                )
              }
              const questionsOfDebuffed = await this.prismaService.roundQuestion.findMany(
                {
                  where: { matchRoundParticipantId: debuffedParticipantId },
                  orderBy: { orderNumber: 'asc' }
                }
              )
              if (questionsOfDebuffed.length > 0) {
                if (debuffRow.typeDebuff === 'ADD_QUESTION') {
                  // Thêm valueDebuff câu hỏi rank cao hơn 1 bậc nếu có
                  const extraRank = higherRank || baseRank
                  const extraLevelN = rankToLevel(extraRank)
                  if (extraLevelN) {
                    const extraPool = await this.questionBankRepo.getRandomQuestions(
                      debuffRow.valueDebuff || 1,
                      extraLevelN
                    )
                    let nextOrder = questionsOfDebuffed.length + 1
                    for (const extra of extraPool) {
                      await this.prismaService.roundQuestion.create({
                        data: {
                          matchRoundParticipantId: debuffedParticipantId,
                          questionBankId: extra.id,
                          timeLimitMs: TIME_LIMIT_ANSWER_QUESTION_MS,
                          basePoints: 0,
                          orderNumber: nextOrder++,
                          debuffId: debuffRow.id
                        }
                      })
                    }
                  }
                  // ✅ CRITICAL FIX: Update questionsTotal to reflect additional questions added by debuff
                  const debuffValueDebuff = debuffRow.valueDebuff || 1
                  await this.prismaService.matchRoundParticipant.update({
                    where: { id: debuffedParticipantId },
                    data: {
                      questionsTotal: {
                        increment: debuffValueDebuff
                      }
                    }
                  })
                  this.logger.log(
                    `[MatchRoundParticipant] Updated questionsTotal for participant ${debuffedParticipantId}: +${debuffValueDebuff} extra questions from ADD_QUESTION debuff`
                  )
                } else if (debuffRow.typeDebuff === 'DECREASE_POINT') {
                  const target =
                    questionsOfDebuffed[
                      Math.floor(Math.random() * questionsOfDebuffed.length)
                    ]
                  await this.prismaService.roundQuestion.update({
                    where: { id: target.id },
                    data: {
                      debuffId: debuffRow.id,
                      basePoints: Math.max(
                        10,
                        target.basePoints - (debuffRow.valueDebuff || 0)
                      )
                    }
                  })
                } else if (debuffRow.typeDebuff === 'DISCOMFORT_VISION') {
                  const target =
                    questionsOfDebuffed[
                      Math.floor(Math.random() * questionsOfDebuffed.length)
                    ]
                  await this.prismaService.roundQuestion.update({
                    where: { id: target.id },
                    data: {
                      debuffId: debuffRow.id // Không đổi timeLimitMs
                    }
                  })
                }
              }
            }
          } catch (debuffError) {
            this.logger.warn(
              `[MatchRoundParticipant] Debuff application failed: ${debuffError.message}`
            )
          }
        }
      }

      // Cập nhật status round participant về PENDING nếu chưa
      await this.prismaService.matchRoundParticipant.updateMany({
        where: { matchRoundId: roundId, deletedAt: null },
        data: { status: RoundStatus.PENDING }
      })
      await this.prismaService.matchRound.update({
        where: { id: roundId },
        data: { status: RoundStatus.PENDING }
      })

      this.logger.log(
        `[MatchRoundParticipant] Round ${roundId} completed - Updated status to PENDING for round and all participants`
      )

      // Kiểm tra nếu tất cả rounds của match đều PENDING -> start Round ONE
      const allRounds = await this.prismaService.matchRound.findMany({
        where: { matchId, deletedAt: null },
        include: { participants: true }
      })
      const allPending = allRounds.every((r) => r.status === RoundStatus.PENDING)

      this.logger.log(
        `[MatchRoundParticipant] AllPending check: ${allPending}, Total rounds: ${allRounds.length}, Statuses: ${allRounds.map((r) => `${r.roundNumber}=${r.status}`).join(', ')}`
      )

      if (allPending) {
        const roundOne = allRounds.find((r) => r.roundNumber === MatchRoundNumber.ONE)
        if (roundOne) {
          // ✅ GUARD: Check if round already IN_PROGRESS to prevent duplicate notifications
          if (roundOne.status === 'IN_PROGRESS') {
            this.logger.warn(
              `[MatchRoundParticipant] Round ONE already IN_PROGRESS for match ${matchId}, skipping notifyRoundStarting`
            )
            return
          }

          // Schedule Round ONE start after 5s thay vì start ngay lập tức
          const roundOneParticipants =
            await this.prismaService.matchRoundParticipant.findMany({
              where: { matchRoundId: roundOne.id, deletedAt: null },
              include: {
                matchParticipant: { include: { user: true } }
              },
              orderBy: { orderSelected: 'asc' }
            })
          if (roundOneParticipants.length === 2) {
            const userId1 = roundOneParticipants[0].matchParticipant.userId
            const userId2 = roundOneParticipants[1].matchParticipant.userId
            // Countdown socket
            // this.matchingGateway.notifyRoundStarting(
            //   matchId,
            //   userId1,
            //   userId2,
            //   'ONE',
            //   5000
            // )
            // Enqueue START_ROUND job
            // await this.matchRoundParticipantTimeoutQueue.add(
            //   BullAction.START_ROUND,
            //   { matchId, matchRoundId: roundOne.id },
            //   { delay: 5000 }
            // )
            this.logger.log(
              `[MatchRoundParticipant] Scheduled Round ONE to start in 5 seconds for match ${matchId}`
            )
          } else {
            this.logger.warn(
              `[MatchRoundParticipant] Not enough participants to schedule Round ONE for match ${matchId}`
            )
          }
        }
      } else {
        // Not all rounds are PENDING yet, need to move to next round for Pokemon selection
        this.logger.log(
          `[MatchRoundParticipant] Not all rounds PENDING yet, moving to next round after ${roundId}`
        )
        const currentRound = await this.prismaService.matchRound.findUnique({
          where: { id: roundId },
          include: { match: true }
        })
        if (currentRound) {
          this.logger.log(
            `[MatchRoundParticipant] Calling moveToNextRound for round ${currentRound.roundNumber} of match ${matchId}`
          )
          await this.moveToNextRound(currentRound)
        } else {
          this.logger.warn(
            `[MatchRoundParticipant] Could not fetch currentRound ${roundId} to move to next`
          )
        }
      }
    } catch (err) {
      this.logger.error(
        `[MatchRoundParticipant] Error in handleQuestionsAndDebuffForCompletedSelection: ${err.message}`
      )
    }
  }
}
