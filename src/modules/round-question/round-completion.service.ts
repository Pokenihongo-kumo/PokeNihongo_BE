import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { MatchService } from '@/modules/match/match.service'
import { UserCoreService } from '@/modules/user/user-core.service'
import { calculateEloGain, calculateEloLoss, convertEloToRank } from '@/shared/helpers'
import { MatchingGateway } from '@/websockets/matching.gateway'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { Queue } from 'bull'
import { RoundQuestionRepo } from './round-question.repo'

// Closing a round once both players are done, scheduling the next round and
// closing the match (winner, elo, season rank, socket events). One copy for
// both ways a round ends: the last answer (RoundQuestionService) and the last
// question timing out (RoundQuestionTimeoutProcessor). Errors go to the
// caller, which keeps its own policy (the processor logs them).
@Injectable()
export class RoundCompletionService {
  private readonly logger = new Logger(RoundCompletionService.name)

  constructor(
    private readonly roundQuestionRepo: RoundQuestionRepo,
    private readonly matchService: MatchService,
    private readonly userCoreService: UserCoreService,
    private readonly matchingGateway: MatchingGateway,
    @InjectQueue(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
    private readonly matchRoundParticipantTimeoutQueue: Queue
  ) {}

  // The following methods are adapted from processor logic to keep behaviour consistent
  async checkAndCompleteRound(matchRoundId: number, matchId: number) {
    // fetch round and verify both participants completed
    const matchRound = await this.roundQuestionRepo.findRoundWithPlayers(matchRoundId)
    if (!matchRound) return

    // ✅ GUARD: Skip if round already COMPLETED to prevent duplicate emissions
    if (matchRound.status === 'COMPLETED') {
      this.logger.log(
        `[RoundCompletion] Round ${matchRoundId} already COMPLETED, skipping duplicate completion`
      )
      return
    }

    const allParticipants = matchRound.participants
    const allCompleted = allParticipants.every((p) => p.status === 'COMPLETED')
    if (!allCompleted) {
      const completedParticipant = allParticipants.find((p) => p.status === 'COMPLETED')
      if (completedParticipant) {
        const completedUserId = completedParticipant.matchParticipant.userId
        this.matchingGateway.notifyWaitingForOpponent(
          matchId,
          completedUserId,
          matchRound.roundNumber
        )
      }
      return
    }

    // ✅ NEW LOGIC: Check for tie scenarios
    const [p1, p2] = allParticipants

    // Fetch answer counts for both participants
    const p1AnswerCount = await this.roundQuestionRepo.countAnswered(p1.id)

    const p2AnswerCount = await this.roundQuestionRepo.countAnswered(p2.id)

    this.logger.log(
      `[RoundCompletion] Round results: p1={points:${p1.points}, answers:${p1AnswerCount}}, p2={points:${p2.points}, answers:${p2AnswerCount}}`
    )

    let winnerId: number | null = null

    // ✅ TIE CASE 1: Both have 0 points and neither answered any question
    if (
      (p1.points || 0) === 0 &&
      (p2.points || 0) === 0 &&
      p1AnswerCount === 0 &&
      p2AnswerCount === 0
    ) {
      this.logger.log(
        `[RoundCompletion] TIE: Both participants have 0 points and no answers`
      )
      winnerId = null
    }
    // ✅ TIE CASE 2: Both have 0 points, but one answered and one didn't
    else if (
      (p1.points || 0) === 0 &&
      (p2.points || 0) === 0 &&
      p1AnswerCount === 0 &&
      p2AnswerCount > 0
    ) {
      winnerId = p2.matchParticipantId
      this.logger.log(
        `[RoundCompletion] Participant ${p2.matchParticipantId} wins: answered ${p2AnswerCount} questions vs ${p1AnswerCount}`
      )
    } else if (
      (p1.points || 0) === 0 &&
      (p2.points || 0) === 0 &&
      p1AnswerCount > 0 &&
      p2AnswerCount === 0
    ) {
      winnerId = p1.matchParticipantId
      this.logger.log(
        `[RoundCompletion] Participant ${p1.matchParticipantId} wins: answered ${p1AnswerCount} questions vs ${p2AnswerCount}`
      )
    }
    // ✅ Normal comparison: higher points wins
    else if ((p1.points || 0) > (p2.points || 0)) {
      winnerId = p1.matchParticipantId
      this.logger.log(
        `[RoundCompletion] Participant ${p1.matchParticipantId} wins with ${p1.points} points vs ${p2.points}`
      )
    } else if ((p1.points || 0) < (p2.points || 0)) {
      winnerId = p2.matchParticipantId
      this.logger.log(
        `[RoundCompletion] Participant ${p2.matchParticipantId} wins with ${p2.points} points vs ${p1.points}`
      )
    } else {
      // Equal points, compare time
      if ((p1.totalTimeMs || 0) < (p2.totalTimeMs || 0)) {
        winnerId = p1.matchParticipantId
        this.logger.log(
          `[RoundCompletion] Participant ${p1.matchParticipantId} wins by faster time: ${p1.totalTimeMs}ms vs ${p2.totalTimeMs}ms`
        )
      } else {
        winnerId = p2.matchParticipantId
        this.logger.log(
          `[RoundCompletion] Participant ${p2.matchParticipantId} wins by faster time: ${p2.totalTimeMs}ms vs ${p1.totalTimeMs}ms`
        )
      }
    }

    const updatedRound = await this.roundQuestionRepo.completeRound(
      matchRoundId,
      winnerId
    )

    const userId1 = allParticipants[0].matchParticipant.userId
    const userId2 = allParticipants[1].matchParticipant.userId
    this.matchingGateway.notifyRoundCompleted(matchId, userId1, userId2, updatedRound)

    await this.scheduleNextRound(matchId, updatedRound.roundNumber)
  }

  private async scheduleNextRound(matchId: number, currentRoundNumber: string) {
    const roundMap: Record<string, string | null> = {
      ONE: 'TWO',
      TWO: 'THREE',
      THREE: null
    }
    const nextRoundNumber = roundMap[currentRoundNumber]
    if (!nextRoundNumber) {
      await this.completeMatch(matchId)
      return
    }

    const nextRound = await this.roundQuestionRepo.findRoundByNumber(
      matchId,
      nextRoundNumber
    )
    if (!nextRound) return

    // ✅ GUARD: Check if round already IN_PROGRESS to prevent duplicate notifications
    if (nextRound.status === 'IN_PROGRESS') {
      this.logger.log(
        `[RoundCompletion] Round ${nextRoundNumber} already IN_PROGRESS for match ${matchId}, skipping notifyRoundStarting`
      )
      return
    }

    const userId1 = nextRound.participants[0]?.matchParticipant.userId
    const userId2 = nextRound.participants[1]?.matchParticipant.userId
    if (!userId1 || !userId2) return

    this.matchingGateway.notifyRoundStarting(
      matchId,
      userId1,
      userId2,
      nextRoundNumber,
      5 // seconds (the START_ROUND job below waits 5000 ms); 5000 read as 5000 s
    )

    await this.matchRoundParticipantTimeoutQueue.add(
      BullAction.START_ROUND,
      { matchRoundId: nextRound.id, matchId },
      { delay: 5000 }
    )
  }

  private async completeMatch(matchId: number) {
    // Guard check: prevent duplicate processing if match already completed
    const currentMatch = await this.matchService.findStatusById(matchId)

    if (currentMatch?.status === 'COMPLETED') {
      this.logger.log(
        `[RoundCompletion] Match ${matchId} already COMPLETED, skipping duplicate processing`
      )
      return
    }

    this.logger.log(`[RoundCompletion] Starting completeMatch for matchId=${matchId}`)

    // similar to processor.completeMatch
    const allRounds = await this.roundQuestionRepo.findRoundsOfMatch(matchId)
    if (allRounds.length !== 3) {
      this.logger.warn(
        `[RoundCompletion] Match ${matchId} has ${allRounds.length} rounds, expected 3`
      )
      return
    }

    const roundWinCounts = new Map<number, number>()
    let tieCount = 0

    for (const round of allRounds) {
      if (round.roundWinnerId) {
        roundWinCounts.set(
          round.roundWinnerId,
          (roundWinCounts.get(round.roundWinnerId) || 0) + 1
        )
      } else {
        // ✅ Round is a tie (roundWinnerId is null)
        tieCount++
      }
    }

    this.logger.log(
      `[RoundCompletion] Round win counts: ${JSON.stringify(Object.fromEntries(roundWinCounts))}, ties=${tieCount}`
    )

    let matchWinnerId: number | null = null
    let maxWins = 0
    for (const [participantId, wins] of roundWinCounts.entries())
      if (wins > maxWins) {
        maxWins = wins
        matchWinnerId = participantId
      }

    // ✅ MATCH TIE: No one won 2 rounds (all 3 are ties OR 1-1-tie OR 0-0-tie, etc.)
    if (maxWins === 0 && tieCount > 0) {
      this.logger.log(
        `[RoundCompletion] MATCH TIE: All 3 rounds resulted in ties (no clear winner)`
      )
      matchWinnerId = null
    } else if (maxWins === 0 || !matchWinnerId) {
      // ✅ Fallback: Use total points as tiebreaker (if somehow no wins recorded)
      const participantTotals = new Map<number, number>()
      for (const round of allRounds)
        for (const participant of round.participants)
          participantTotals.set(
            participant.matchParticipantId,
            (participantTotals.get(participant.matchParticipantId) || 0) +
              (participant.points || 0)
          )
      let maxPoints = 0
      for (const [participantId, totalPoints] of participantTotals.entries())
        if (totalPoints > maxPoints) {
          maxPoints = totalPoints
          matchWinnerId = participantId
        }

      // ✅ If still no winner (all totals are 0), it's a tie
      if (maxPoints === 0 && matchWinnerId) {
        this.logger.log(`[RoundCompletion] MATCH TIE: Both players have 0 total points`)
        matchWinnerId = null
      }
    }

    // ✅ Handle tie case: no winner
    let winnerParticipant: any = null
    if (matchWinnerId) {
      winnerParticipant =
        await this.roundQuestionRepo.findParticipantWithUser(matchWinnerId)
      this.logger.log(
        `[RoundCompletion] Match winner determined: participantId=${matchWinnerId}, userId=${winnerParticipant?.userId}, maxWins=${maxWins}`
      )
    } else {
      this.logger.log(`[RoundCompletion] Match is a TIE: no winner, maxWins=${maxWins}`)
    }

    // Wrap entire flow in atomic transaction to prevent race conditions
    try {
      const result = await this.roundQuestionRepo.withTransaction(
        async (tx) => {
          // First, update match status to COMPLETED to claim ownership
          const completedMatch = await this.matchService.completeWithWinner(
            matchId,
            winnerParticipant?.userId || null,
            tx
          )

          // Calculate and update ELO within same transaction
          const participants = completedMatch.participants || []
          const winnerUserId = completedMatch.winnerId
          const loserUserId = participants.find((p) => p.userId !== winnerUserId)?.userId

          let eloGained = 0
          let eloLost = 0

          // Track rank changes for each participant
          const rankChanges = new Map<number, any>()

          // ✅ Only update ELO if there's a clear winner (not a tie)
          if (winnerUserId && loserUserId) {
            const winnerUser = participants.find((p) => p.userId === winnerUserId)?.user
            const loserUser = participants.find((p) => p.userId === loserUserId)?.user

            const winnerElo = (winnerUser && winnerUser.eloscore) || 0
            const loserElo = (loserUser && loserUser.eloscore) || 0

            this.logger.log(
              `[RoundCompletion] ELO before: winner=${winnerElo}, loser=${loserElo}`
            )

            eloGained = calculateEloGain(winnerElo, loserElo)
            eloLost = calculateEloLoss(loserElo, winnerElo)

            this.logger.log(
              `[RoundCompletion] ELO delta: gained=${eloGained}, lost=${eloLost}`
            )

            const newWinnerElo = Math.min(3000, winnerElo + eloGained)
            const newLoserElo = Math.max(0, loserElo - eloLost)

            // Calculate rank changes for winner
            const winnerOldRank = convertEloToRank(winnerElo)
            const winnerNewRank = convertEloToRank(newWinnerElo)
            let winnerStatus: string
            if (winnerOldRank !== winnerNewRank) {
              winnerStatus = 'RANK_UP'
            } else {
              winnerStatus = 'RANK_MAINTAIN'
            }
            rankChanges.set(winnerUserId, {
              status: winnerStatus,
              rankInfo: {
                from: { rank: winnerOldRank, elo: winnerElo },
                to: { rank: winnerNewRank, elo: newWinnerElo }
              }
            })

            // Calculate rank changes for loser
            const loserOldRank = convertEloToRank(loserElo)
            const loserNewRank = convertEloToRank(newLoserElo)
            let loserStatus: string
            if (loserOldRank !== loserNewRank) {
              loserStatus = 'RANK_DOWN'
            } else {
              loserStatus = 'RANK_MAINTAIN'
            }
            rankChanges.set(loserUserId, {
              status: loserStatus,
              rankInfo: {
                from: { rank: loserOldRank, elo: loserElo },
                to: { rank: loserNewRank, elo: newLoserElo }
              }
            })

            // Update Match with ELO deltas
            await this.matchService.setEloResult(matchId, eloGained, eloLost, tx)

            // Update winner ELO (cap at 3000)
            await this.userCoreService.setEloscore(winnerUserId, newWinnerElo, tx)

            // Update loser ELO
            await this.userCoreService.setEloscore(loserUserId, newLoserElo, tx)

            this.logger.log(
              `[RoundCompletion] ELO after: winner=${newWinnerElo}, loser=${newLoserElo}`
            )
          } else {
            // ✅ MATCH TIE: Check if both players didn't answer any questions
            const user1 = participants[0]
            const user2 = participants[1]

            if (user1 && user2) {
              // Count total answers across all 3 rounds for each user
              const user1AnswerCount = await this.roundQuestionRepo.countAnsweredInMatch(
                matchId,
                user1.userId,
                tx
              )

              const user2AnswerCount = await this.roundQuestionRepo.countAnsweredInMatch(
                matchId,
                user2.userId,
                tx
              )

              // ✅ If BOTH didn't answer any questions -> Both lose ELO
              if (user1AnswerCount === 0 && user2AnswerCount === 0) {
                const user1Elo = user1.user?.eloscore || 0
                const user2Elo = user2.user?.eloscore || 0

                // Calculate ELO loss for both (use average ELO as opponent)
                const avgElo = (user1Elo + user2Elo) / 2
                const user1EloLoss = calculateEloLoss(user1Elo, avgElo)
                const user2EloLoss = calculateEloLoss(user2Elo, avgElo)

                this.logger.log(
                  `[RoundCompletion] Match TIE (no answers): Both lose ELO - user1Loss=${user1EloLoss}, user2Loss=${user2EloLoss}`
                )

                const newUser1Elo = Math.max(0, user1Elo - user1EloLoss)
                const newUser2Elo = Math.max(0, user2Elo - user2EloLoss)

                // Calculate rank changes for user1
                const user1OldRank = convertEloToRank(user1Elo)
                const user1NewRank = convertEloToRank(newUser1Elo)
                let user1Status: string
                if (user1OldRank !== user1NewRank) {
                  user1Status = 'RANK_DOWN'
                } else {
                  user1Status = 'RANK_MAINTAIN'
                }
                rankChanges.set(user1.userId, {
                  status: user1Status,
                  rankInfo: {
                    from: { rank: user1OldRank, elo: user1Elo },
                    to: { rank: user1NewRank, elo: newUser1Elo }
                  }
                })

                // Calculate rank changes for user2
                const user2OldRank = convertEloToRank(user2Elo)
                const user2NewRank = convertEloToRank(newUser2Elo)
                let user2Status: string
                if (user2OldRank !== user2NewRank) {
                  user2Status = 'RANK_DOWN'
                } else {
                  user2Status = 'RANK_MAINTAIN'
                }
                rankChanges.set(user2.userId, {
                  status: user2Status,
                  rankInfo: {
                    from: { rank: user2OldRank, elo: user2Elo },
                    to: { rank: user2NewRank, elo: newUser2Elo }
                  }
                })

                // Update both users' ELO (deduct)
                await this.userCoreService.setEloscore(user1.userId, newUser1Elo, tx)

                await this.userCoreService.setEloscore(user2.userId, newUser2Elo, tx)

                // Store the loss amount (both lose, so eloLost represents the penalty)
                eloLost = Math.round((user1EloLoss + user2EloLoss) / 2) // Average loss

                await this.matchService.setEloResult(matchId, 0, eloLost, tx)

                this.logger.log(
                  `[RoundCompletion] ELO after penalty: user1=${newUser1Elo}, user2=${newUser2Elo}`
                )
              } else {
                // Normal tie with answers -> No ELO changes
                this.logger.log(
                  `[RoundCompletion] Match TIE (with answers): No ELO changes, eloGained=${eloGained}, eloLost=${eloLost}`
                )
              }
            }
          }

          return { completedMatch, eloGained, eloLost, rankChanges }
        },
        { timeout: 10000 }
      ) // 10 seconds timeout for entire transaction)

      this.logger.log(
        `[RoundCompletion] Transaction completed successfully for match ${matchId}`
      )

      // Re-fetch match with updated ELO for notification (outside transaction)
      const userId1 = result.completedMatch.participants[0]?.userId
      const userId2 = result.completedMatch.participants[1]?.userId

      if (userId1 && userId2) {
        const updatedMatch = await this.matchService.findCompletedWithDetails(matchId)

        this.logger.log(
          `[RoundCompletion] Sending match completed notification for match ${matchId}`
        )

        // Enhance match data with rank changes
        const matchWithRankChanges = {
          ...updatedMatch,
          participants:
            updatedMatch?.participants.map((p) => {
              const rankChange = result.rankChanges.get(p.userId)
              return {
                ...p,
                rankChangeStatus: rankChange?.status || 'RANK_MAINTAIN',
                rankChangeInfo: rankChange?.rankInfo || null
              }
            }) || []
        }

        this.matchingGateway.notifyMatchCompleted(
          matchId,
          userId1,
          userId2,
          matchWithRankChanges || result.completedMatch
        )
      }
    } catch (e) {
      this.logger.error(`[RoundCompletion] Error completing match ${matchId}:`, e)
      // Don't swallow errors - let them bubble up
      throw e
    }
  }
}
