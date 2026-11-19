import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { MatchRoundNumber } from '@/common/constants/match.constant'
import { DebuffRoundService } from '@/modules/debuff-round/debuff-round.service'
import { MatchRoundService } from '@/modules/match-round/match-round.service'
import { PokemonService } from '@/modules/pokemon/pokemon.service'
import { QuestionBankService } from '@/modules/question-bank/question-bank.service'
import { RoundQuestionService } from '@/modules/round-question/round-question.service'
import { UserCoreService } from '@/modules/user/user-core.service'
import { addTimeUTC, convertEloToRank } from '@/shared/helpers'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { Queue } from 'bull'
import {
  QUESTIONS_PER_ROUND,
  TIME_CHOOSE_POKEMON_MS,
  TIME_LIMIT_ANSWER_QUESTION_MS
} from './match-round-participant.constants'
import { MatchRoundParticipantRepo } from './match-round-participant.repo'

const RANK_THRESHOLDS = [
  { rank: 'N5', maxElo: 1000 },
  { rank: 'N4', maxElo: 2000 },
  { rank: 'N3', maxElo: 3000 }
]

const rankToLevel = (rank?: string | null): number | undefined => {
  if (!rank?.startsWith('N')) return undefined
  const n = parseInt(rank.substring(1), 10)
  return isNaN(n) ? undefined : n
}

// What happens once both players of a round have their Pokemon: the round's
// questions and debuff, and handing the pick to the next round. One copy for
// both ways the picks end: a player's pick (MatchRoundParticipantService) and
// the pick timer (MatchRoundParticipantTimeoutProcessor). Rules follow the
// diff table approved on 2026-11-19 (service-extraction-plan section 7).
@Injectable()
export class RoundStartService {
  private readonly logger = new Logger(RoundStartService.name)

  constructor(
    private readonly matchRoundParticipantRepo: MatchRoundParticipantRepo,
    private readonly matchRoundService: MatchRoundService,
    private readonly userCoreService: UserCoreService,
    private readonly questionBankService: QuestionBankService,
    private readonly roundQuestionService: RoundQuestionService,
    private readonly debuffRoundService: DebuffRoundService,
    private readonly pokemonService: PokemonService,
    @InjectQueue(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
    private readonly matchRoundParticipantTimeoutQueue: Queue
  ) {}

  // The same questions for both players (by their ranks), then one random
  // debuff on the Pokemon that loses the matchup. Errors are logged (as both
  // callers did) and give false: the pick path then stops, as it did.
  async generateQuestionsAndDebuff(
    matchRoundId: number,
    matchId: number
  ): Promise<boolean> {
    try {
      const participants =
        await this.matchRoundParticipantRepo.findLiveInRoundWithPicks(matchRoundId)
      if (participants.length < 2) return true

      // 2.1: a pick and the pick timer can both get here; questions once only
      const existing = await this.roundQuestionService.countForParticipants(
        participants.map((p) => p.id)
      )
      if (existing > 0) {
        this.logger.debug(`Questions already exist for round ${matchRoundId}, skipped`)
        return true
      }

      const matchParticipants =
        await this.matchRoundParticipantRepo.findMatchParticipants(matchId)
      const users = await this.userCoreService.findElos(
        matchParticipants.map((m) => m.userId)
      )
      const eloMap = new Map(users.map((u) => [u.id, u.eloscore || 0]))
      // 2.2: average over the match's players (a missing user counts 0)
      const elos = matchParticipants.map((m) => eloMap.get(m.userId) || 0)
      const avgElo = elos.reduce((a, b) => a + b, 0) / elos.length

      const sortedRanks = Array.from(new Set(elos.map((elo) => convertEloToRank(elo))))
        .filter((r) => r && r !== 'Unranked')
        .sort() as string[]
      const baseRank: string | undefined = sortedRanks[0]
      const higherRank: string | null = sortedRanks.length > 1 ? sortedRanks[1] : null

      let higherPercent = 0
      if (higherRank) {
        const lowMax = RANK_THRESHOLDS.find((t) => t.rank === baseRank)?.maxElo || 0
        const diff = Math.max(0, avgElo - lowMax)
        const rawPercent = Math.floor(diff / 10) // 277 -> 27
        higherPercent = Math.min(50, Math.max(10, Math.floor(rawPercent / 10) * 10)) // 27 -> 20
      }

      const higherCount = higherRank
        ? Math.round((QUESTIONS_PER_ROUND * higherPercent) / 100)
        : 0
      const baseCount = QUESTIONS_PER_ROUND - higherCount

      const baseLevelN = rankToLevel(baseRank)
      const finalBase = baseLevelN
        ? await this.questionBankService.getRandomQuestions(
            Math.max(0, baseCount),
            baseLevelN
          )
        : []
      let finalHigher: { id: number }[] = []
      const higherLevelN = rankToLevel(higherRank)
      if (higherCount > 0 && higherLevelN) {
        finalHigher = await this.questionBankService.getRandomQuestions(
          higherCount,
          higherLevelN
        )
      }

      const combined = [...finalBase, ...finalHigher].sort(() => Math.random() - 0.5)
      for (const p of participants) {
        let orderNumber = 1
        for (const q of combined) {
          await this.roundQuestionService.createQuestionRow({
            matchRoundParticipantId: p.id,
            questionBankId: q.id,
            timeLimitMs: TIME_LIMIT_ANSWER_QUESTION_MS,
            basePoints: 100,
            orderNumber: orderNumber++
          })
        }
      }
      await this.matchRoundParticipantRepo.setQuestionsTotal(
        participants.map((p) => p.id),
        combined.length
      )

      await this.applyDebuff(participants, baseRank, higherRank)
      return true
    } catch (error) {
      this.logger.error(
        `Error generating questions/debuff for round ${matchRoundId}: ${error?.message}`
      )
      return false
    }
  }

  private async applyDebuff(
    participants: Awaited<
      ReturnType<MatchRoundParticipantRepo['findLiveInRoundWithPicks']>
    >,
    baseRank: string | undefined,
    higherRank: string | null
  ) {
    const [p1, p2] = participants
    const pokemon1 = p1.selectedUserPokemon?.pokemonId
    const pokemon2 = p2.selectedUserPokemon?.pokemonId
    // 2.4: no debuff unless both players have a Pokemon
    if (participants.length !== 2 || !pokemon1 || !pokemon2) return

    try {
      const debuffs = await this.debuffRoundService.findLiveDebuffs()
      const debuffRow = debuffs.length
        ? debuffs[Math.floor(Math.random() * debuffs.length)]
        : null
      if (!debuffRow) return

      let debuffedParticipantId: number | null = null
      try {
        const { debuffedPokemonId } = await this.pokemonService.calculateDebuffedPokemon(
          pokemon1,
          pokemon2
        )
        if (pokemon1 === debuffedPokemonId) debuffedParticipantId = p1.id
        else if (pokemon2 === debuffedPokemonId) debuffedParticipantId = p2.id
      } catch (calcError) {
        this.logger.warn(
          `Failed to calculate the debuffed Pokemon: ${calcError?.message}`
        )
        // 2.3: the lower pokemonId gets it
        debuffedParticipantId = pokemon1 < pokemon2 ? p1.id : p2.id
      }
      if (!debuffedParticipantId) return

      try {
        await this.matchRoundParticipantRepo.assignDebuff(
          debuffedParticipantId,
          debuffRow.id,
          QUESTIONS_PER_ROUND
        )
      } catch (assignErr) {
        this.logger.warn(
          `Failed to assign debuffId=${debuffRow.id} to participant ${debuffedParticipantId}: ${assignErr?.message}`
        )
      }

      const questionsOfDebuffed =
        await this.roundQuestionService.findQuestionsOfParticipant(debuffedParticipantId)
      if (questionsOfDebuffed.length === 0) return

      if (debuffRow.typeDebuff === 'ADD_QUESTION') {
        const extraLevelN = rankToLevel(higherRank || baseRank)
        if (!extraLevelN) return
        const extraPool = await this.questionBankService.getRandomQuestions(
          debuffRow.valueDebuff || 1,
          extraLevelN
        )
        let nextOrder = questionsOfDebuffed.length + 1
        for (const extra of extraPool) {
          await this.roundQuestionService.createQuestionRow({
            matchRoundParticipantId: debuffedParticipantId,
            questionBankId: extra.id,
            timeLimitMs: TIME_LIMIT_ANSWER_QUESTION_MS,
            // 2.5: the extra questions are a burden, they give no points
            basePoints: 0,
            orderNumber: nextOrder++,
            debuffId: debuffRow.id
          })
        }
        // the round completes when every question is answered
        await this.matchRoundParticipantRepo.addQuestionsTotal(
          debuffedParticipantId,
          debuffRow.valueDebuff || 1
        )
      } else if (debuffRow.typeDebuff === 'DECREASE_POINT') {
        const target =
          questionsOfDebuffed[Math.floor(Math.random() * questionsOfDebuffed.length)]
        await this.roundQuestionService.setDebuffAndPoints(
          target.id,
          debuffRow.id,
          Math.max(10, target.basePoints - (debuffRow.valueDebuff || 0))
        )
      } else if (debuffRow.typeDebuff === 'DISCOMFORT_VISION') {
        const target =
          questionsOfDebuffed[Math.floor(Math.random() * questionsOfDebuffed.length)]
        await this.roundQuestionService.setDebuff(target.id, debuffRow.id)
      }
    } catch (error) {
      this.logger.warn(`Debuff application failed: ${error?.message}`)
    }
  }

  // The finished round goes PENDING; the next round's first picker gets the
  // pick timer. Errors are logged, as both callers did before.
  async moveToNextRound(currentMatchRound: {
    id: number
    matchId: number
    roundNumber: string
  }): Promise<void> {
    try {
      await this.matchRoundService.setRoundPending(currentMatchRound.id)

      const nextRoundMap: Record<string, string | null> = {
        [MatchRoundNumber.ONE]: MatchRoundNumber.TWO,
        [MatchRoundNumber.TWO]: MatchRoundNumber.THREE,
        [MatchRoundNumber.THREE]: null
      }
      const nextRoundNumber = nextRoundMap[currentMatchRound.roundNumber]
      if (!nextRoundNumber) return

      const nextRound = await this.matchRoundService.findByMatchIdAndRoundNumber(
        currentMatchRound.matchId,
        nextRoundNumber as never
      )
      if (!nextRound) {
        this.logger.warn(
          `Next round ${nextRoundNumber} not found for match ${currentMatchRound.matchId}`
        )
        return
      }

      // 2.6: live participants only
      const [firstParticipant] = await this.matchRoundParticipantRepo.findMany({
        where: { matchRoundId: nextRound.id, deletedAt: null },
        orderBy: { orderSelected: 'asc' }
      })
      if (!firstParticipant) return

      await this.matchRoundParticipantRepo.setPickDeadline(
        firstParticipant.id,
        addTimeUTC(new Date(), TIME_CHOOSE_POKEMON_MS)
      )
      await this.matchRoundParticipantTimeoutQueue.add(
        BullAction.CHECK_POKEMON_SELECTION_TIMEOUT,
        { matchRoundParticipantId: firstParticipant.id },
        { delay: TIME_CHOOSE_POKEMON_MS }
      )
    } catch (error) {
      this.logger.error(
        `Error moving to next round for match ${currentMatchRound.matchId}`,
        error
      )
    }
  }
}
