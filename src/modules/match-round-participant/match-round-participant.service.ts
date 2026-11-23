import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import {
  MatchRoundNumber,
  MatchRoundParticipantStatus,
  RoundStatus
} from '@/common/constants/match.constant'
import { MatchingSocketMessage } from '@/i18n/message-keys'
import { MatchRoundService } from '@/modules/match-round/match-round.service'
import { MatchService } from '@/modules/match/match.service'
import { UserPokemonService } from '@/modules/user-pokemon/user-pokemon.service'
import { NotFoundRecordException } from '@/shared/error'
import {
  addTimeUTC,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { Queue } from 'bull'
import { MatchingGateway } from '@/websockets/matching.gateway'
import {
  MatchRoundParticipantNotFoundException,
  NotYourTurnToPickException,
  PokemonSelectionExpiredException
} from './dto/match-round-participant.error'
import {
  ChoosePokemonMatchRoundParticipantBody,
  CreateMatchRoundParticipantBody,
  UpdateMatchRoundParticipantBody
} from './dto/match-round-participant.zod-dto'
import { TIME_CHOOSE_POKEMON_MS } from './match-round-participant.constants'
import { MatchRoundParticipantRepo } from './match-round-participant.repo'
import { RoundStartService } from './round-start.service'

@Injectable()
export class MatchRoundParticipantService {
  private readonly logger = new Logger(MatchRoundParticipantService.name)

  constructor(
    private matchRoundParticipantRepo: MatchRoundParticipantRepo,
    private readonly matchRoundService: MatchRoundService,
    private readonly userPokemonService: UserPokemonService,
    private readonly matchService: MatchService,
    private readonly matchingGateway: MatchingGateway,
    @InjectQueue(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
    private readonly matchRoundParticipantTimeoutQueue: Queue,
    private readonly roundStart: RoundStartService
  ) {}

  async list(pagination: PaginationQuery) {
    const data = await this.matchRoundParticipantRepo.list(pagination)
    return data
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number) {
    const matchRoundParticipant = await this.matchRoundParticipantRepo.findById(id)
    if (!matchRoundParticipant) {
      throw new MatchRoundParticipantNotFoundException()
    }

    return matchRoundParticipant
  }

  async create({
    userId,
    data
  }: {
    userId: number
    data: CreateMatchRoundParticipantBody
  }) {
    try {
      const result = await this.matchRoundParticipantRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return result
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

  async update({
    id,
    data,
    userId
  }: {
    id: number
    data: UpdateMatchRoundParticipantBody
    userId?: number
  }) {
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
      return matchRoundParticipant
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

  async choosePokemonWithRound({
    matchRoundId,
    userId,
    data
  }: {
    matchRoundId: number
    userId: number
    data: ChoosePokemonMatchRoundParticipantBody
  }) {
    try {
      // Dựa vào matchRoundId lấy ra match-round kèm match và participants
      const existMatchRound =
        await this.matchRoundService.findByIdWithMatchAndParticipants(matchRoundId)
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

      // Out of turn (any round of the match): the pick used to be taken
      if (existMatchRoundParticipant.endTimeSelected === null) {
        throw new NotYourTurnToPickException()
      }

      // Tìm userPokemon dựa vào pokemonId và userId
      const userPokemon = await this.userPokemonService.findByUserAndPokemon(
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
      const freshParticipants =
        await this.matchRoundParticipantRepo.findLiveInRoundOrdered(matchRoundId)

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
        await this.matchRoundService.setRoundPending(matchRoundId)
        await this.matchRoundParticipantRepo.setRoundParticipantsPending(matchRoundId)
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
      const match: any = await this.matchService.findWithPlayers(existMatchRound.match.id)
      const rounds: any[] = await this.matchRoundService.findRoundsWithPicks(
        existMatchRound.match.id
      )

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
        await this.handleQuestionsAndDebuffForCompletedSelection(existMatchRound)

        // CRITICAL: Only check allPending when BOTH users have selected
        // This prevents premature round starting when only one user selected
        const allRounds = await this.matchRoundService.findRoundsWithParticipants(
          existMatchRound.match.id
        )
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
                await this.matchRoundParticipantRepo.findInRoundWithUsers(roundOne.id)
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
      return matchRoundParticipant
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

  async delete({ id, userId }: { id: number; userId?: number }) {
    try {
      const existMatchRoundParticipant = await this.matchRoundParticipantRepo.findById(id)
      if (!existMatchRoundParticipant) {
        throw new MatchRoundParticipantNotFoundException()
      }

      await this.matchRoundParticipantRepo.delete(id)
      return
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new MatchRoundParticipantNotFoundException()
      }
      throw error
    }
  }

  /**
   * Khi cả round đã chọn xong Pokemon: tạo 10 câu hỏi giống nhau cho cả 2 participants, áp dụng debuff, rồi auto start Round ONE nếu tất cả rounds PENDING.
   */
  private async handleQuestionsAndDebuffForCompletedSelection(
    matchRoundWithParticipants: any
  ) {
    try {
      const matchId = matchRoundWithParticipants.match.id
      const roundId = matchRoundWithParticipants.id
      // questions + debuff (once per round); on error stop here, as before
      const generated = await this.roundStart.generateQuestionsAndDebuff(roundId, matchId)
      if (!generated) return

      // Cập nhật status round participant về PENDING nếu chưa
      await this.matchRoundParticipantRepo.setLiveRoundParticipantsPending(roundId)
      await this.matchRoundService.setRoundPending(roundId)

      this.logger.log(
        `[MatchRoundParticipant] Round ${roundId} completed - Updated status to PENDING for round and all participants`
      )

      // Kiểm tra nếu tất cả rounds của match đều PENDING -> start Round ONE
      const allRounds = await this.matchRoundService.findRoundsWithParticipants(matchId)
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
            await this.matchRoundParticipantRepo.findInRoundWithUsers(roundOne.id)
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
        const currentRound = await this.matchRoundService.findRoundWithMatch(roundId)
        if (currentRound) {
          this.logger.log(
            `[MatchRoundParticipant] Calling moveToNextRound for round ${currentRound.roundNumber} of match ${matchId}`
          )
          await this.roundStart.moveToNextRound(currentRound)
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

  // ---- For other modules (module-boundary plan B6) ----
  // Same arguments and results as the repo methods.

  // The repo's update (the service's own update answers the HTTP route)
  updateRoundParticipant(...args: Parameters<MatchRoundParticipantRepo['update']>) {
    return this.matchRoundParticipantRepo.update(...args)
  }

  // The repo's findMany (the service's own findMany answers the HTTP route)
  findRoundParticipants(...args: Parameters<MatchRoundParticipantRepo['findMany']>) {
    return this.matchRoundParticipantRepo.findMany(...args)
  }
}
