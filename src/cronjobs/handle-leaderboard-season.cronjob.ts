import { LeaderboardSeasonService } from '@/modules/leaderboard-season/leaderboard-season.service'
import { RewardService } from '@/modules/reward/reward.service'
import { SeasonRankRewardService } from '@/modules/season-rank-reward/season-rank-reward.service'
import { UserCoreService } from '@/modules/user/user-core.service'
import { UserSeasonHistoryService } from '@/modules/user-season-history/user-season-history.service'
import { addDaysUTC0000, convertEloToRank, todayUTCWith0000 } from '@/shared/helpers'
import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { LeaderboardStatus, RankName, RewardTarget } from '@prisma/client'

// Rewards a re-randomized rank reward is drawn from
const RANDOM_REWARD_TARGETS: RewardTarget[] = [RewardTarget.EXP, RewardTarget.SPARKLES]

@Injectable()
export class HandleLeaderboardSeasonCronjob {
  private readonly logger = new Logger(HandleLeaderboardSeasonCronjob.name)
  constructor(
    private readonly leaderboardSeasonService: LeaderboardSeasonService,
    private readonly seasonRankRewardService: SeasonRankRewardService,
    private readonly userSeasonHistoryService: UserSeasonHistoryService,
    private readonly userCoreService: UserCoreService,
    private readonly rewardService: RewardService
  ) {}

  // Run daily at 00:00 UTC to expire/activate seasons
  @Cron(CronExpression.EVERY_DAY_AT_1AM, { timeZone: 'UTC' })
  async handleLeaderboardSeasonStatus() {
    const now = todayUTCWith0000()
    this.logger.log(`[LeaderboardSeason Cron] Running at ${now.toISOString()}`)

    try {
      // 1) Find ACTIVE seasons that ended before today and finalize them
      const seasonsToExpire = await this.leaderboardSeasonService.findEndedActiveIds(now)
      this.logger.log(
        `[LeaderboardSeason Cron] Found ${seasonsToExpire.length} season(s) to finalize`
      )

      for (const s of seasonsToExpire) {
        try {
          await this.finalizeSeason(s.id)
          // Precreate the next season right after finalizing this one
          await this.precreateNextSeasonFromTemplate(s.id)
          await this.leaderboardSeasonService.setStatus(s.id, 'EXPIRED')
          this.logger.log(`[LeaderboardSeason Cron] Finalized and expired season ${s.id}`)
        } catch (err) {
          this.logger.error(
            `[LeaderboardSeason Cron] Error finalizing season ${s.id}:`,
            err
          )
        }
      }

      // 2) Find PREVIEW seasons valid for today
      // Query all PREVIEW seasons and filter in code (simpler than complex Prisma OR with nulls)
      const allPreview = await this.leaderboardSeasonService.findAllPreview()

      // Filter: (startDate null OR startDate <= now) AND (endDate null OR endDate >= now)
      const candidatesRaw = allPreview.filter((s) => {
        const startOk = s.startDate === null || s.startDate <= now
        const endOk = s.endDate === null || s.endDate >= now
        return startOk && endOk
      })

      // Sort manually: startDate asc (nulls last)
      const candidates = candidatesRaw.sort((a, b) => {
        if (a.startDate === null && b.startDate === null) return 0
        if (a.startDate === null) return 1 // nulls last
        if (b.startDate === null) return -1
        return a.startDate.getTime() - b.startDate.getTime()
      })

      if (candidates.length > 0) {
        const activeCount = await this.leaderboardSeasonService.countActive()
        if (activeCount === 0) {
          const toActivate = candidates[0]
          await this.leaderboardSeasonService.activate(toActivate.id)
          this.logger.log(
            `[LeaderboardSeason Cron] Activated season ID=${toActivate.id}, nameKey=${toActivate.nameKey}`
          )
        } else {
          this.logger.log(
            `[LeaderboardSeason Cron] Skipped activation; already has ACTIVE season (count=${activeCount})`
          )
        }
      } else {
        this.logger.log('[LeaderboardSeason Cron] No PREVIEW season eligible to activate')
      }

      this.logger.log('[LeaderboardSeason Cron] Completed successfully')
    } catch (error) {
      this.logger.error('[LeaderboardSeason Cron] Error:', error)
      throw error
    }
  }

  // Run daily at 01:00 UTC to precreate next season if enabled
  @Cron(CronExpression.EVERY_DAY_AT_2AM, { timeZone: 'UTC' })
  async handlePrecreateNextSeason() {
    const now = todayUTCWith0000()
    this.logger.log(`[LeaderboardSeason Precreate] Running at ${now.toISOString()}`)

    try {
      const activeSeasons = await this.leaderboardSeasonService.findActiveForPrecreate()

      for (const season of activeSeasons) {
        try {
          if (!season.endDate) {
            this.logger.warn(
              `[LeaderboardSeason Precreate] Season ${season.id} has no endDate, skipping`
            )
            continue
          }

          const triggerDate = addDaysUTC0000(
            season.endDate,
            -season.precreateBeforeEndDays
          )
          if (now < triggerDate) {
            this.logger.debug(
              `[LeaderboardSeason Precreate] Season ${season.id} not yet ready (trigger: ${triggerDate.toISOString()})`
            )
            continue
          }

          // Avoid duplicate precreate by checking a nameKey with ".next" prefix
          const nextKeyPrefix = `${season.nameKey}.next`
          const existingNext =
            await this.leaderboardSeasonService.findFirstByNameKeyPrefix(nextKeyPrefix)
          if (existingNext) {
            this.logger.log(
              `[LeaderboardSeason Precreate] Season ${season.id} already has next (${existingNext.id}), skipping`
            )
            continue
          }

          // Compute next season dates based on current season duration
          const durationMs = season.endDate.getTime() - season.startDate.getTime()
          const durationDays = Math.max(1, Math.round(durationMs / (24 * 60 * 60 * 1000)))

          const newStartDate = season.endDate
          const newEndDate = addDaysUTC0000(season.endDate, durationDays)
          const timestamp = Date.now()

          // Create new season in PREVIEW
          const created = await this.leaderboardSeasonService.createSeason({
            nameKey: `leaderboardSeason.name.temp.${timestamp}`,
            startDate: newStartDate,
            endDate: newEndDate,
            status: 'PREVIEW' as LeaderboardStatus,
            enablePrecreate: season.enablePrecreate,
            precreateBeforeEndDays: season.precreateBeforeEndDays,
            isRandomItemAgain: season.isRandomItemAgain,
            createdById: season.createdById ?? undefined
          })

          const finalNameKey = `leaderboardSeason.name.${created.id}`
          const upserts = season.nameTranslations.map((t) => ({
            where: { languageId_key: { languageId: t.languageId, key: finalNameKey } },
            update: { value: t.value },
            create: { languageId: t.languageId, key: finalNameKey, value: t.value }
          }))

          await this.leaderboardSeasonService.setNameKeyWithTranslations(
            created.id,
            finalNameKey,
            upserts
          )

          // Clone SeasonRankRewards from current season
          await this.cloneSeasonRankRewards(
            season.id,
            created.id,
            season.seasonRankRewards,
            season.isRandomItemAgain
          )

          // Disable precreate on current season to avoid multiple next creations
          await this.leaderboardSeasonService.disablePrecreate(season.id)

          this.logger.log(
            `[LeaderboardSeason Precreate] Created next season ${created.id} (${finalNameKey}) and disabled precreate on current ${season.id}`
          )
        } catch (err) {
          this.logger.error(
            `[LeaderboardSeason Precreate] Error creating next season for ${season.id}:`,
            err
          )
        }
      }

      this.logger.log('[LeaderboardSeason Precreate] Completed')
    } catch (error) {
      this.logger.error('[LeaderboardSeason Precreate] Error:', error)
      throw error
    }
  }

  /**
   * Finalize a season: compute final elo/rank, assign rewards, mark claimed, and reset user eloscore.
   * Steps:
   * - Load season details (userHistories, seasonRankRewards)
   * - Compute finalElo/finalRank from current user eloscore
   * - Rank within each rankName by elo desc to get per-rank order
   * - Map (rankName, order) -> SeasonRankReward (and its reward ids)
   * - Update UserSeasonHistory: finalElo, finalRank, seasonRankRewardId, rewardsClaimed=CLAIMED
   * - Reset each participant user's eloscore = max(0, eloscore - 1000)
   */
  private async finalizeSeason(seasonId: number) {
    // 1) Get season details via repo (userHistories + bare seasonRankRewards)
    const season =
      await this.leaderboardSeasonService.findWithDetailsWithoutLang(seasonId)
    if (!season) {
      this.logger.warn(`[FinalizeSeason] Season ${seasonId} not found or deleted`)
      return
    }

    const userHistories = season.userHistories || []
    if (userHistories.length === 0) {
      this.logger.log(`[FinalizeSeason] Season ${seasonId} has no participants`)
      return
    }

    // 2) Load SeasonRankRewards with reward ids for mapping
    const srrList = await this.seasonRankRewardService.findBySeasonWithRewardIds(seasonId)

    // Separate null-order rewards (for all users) from ranked rewards
    const commonRewards = srrList.filter((srr) => srr.order === null)
    const rankedRewards = srrList.filter((srr) => srr.order !== null)

    // Build map: rankName->order->SeasonRankReward (only for ranked rewards)
    const rewardMap = new Map<string, Map<number, { id: number; rewardIds: number[] }>>()
    for (const srr of rankedRewards) {
      if (!rewardMap.has(srr.rankName)) rewardMap.set(srr.rankName, new Map())
      rewardMap
        .get(srr.rankName)!
        .set(srr.order!, { id: srr.id, rewardIds: (srr.rewards || []).map((r) => r.id) })
    }

    // 3) Compute finalElo and finalRank from current user eloscore
    type Participant = {
      ushId: number
      userId: number
      finalElo: number
      finalRank: string
    }
    const participants: Participant[] = userHistories.map((uh: any) => {
      const elo = (uh.user?.eloscore as number) || 0
      const rank = convertEloToRank(elo)
      return { ushId: uh.id, userId: uh.userId, finalElo: elo, finalRank: rank }
    })

    // 4) Persist finalElo/finalRank on UserSeasonHistory
    await this.userSeasonHistoryService.setFinalResults(
      participants.map((p) => ({
        id: p.ushId,
        finalElo: p.finalElo,
        finalRank: p.finalRank
      }))
    )

    // 5) Rank within each rank group by elo desc and determine order
    const rankOrderPriority = ['N3', 'N4', 'N5'] // Highest rank first
    const grouped: Record<string, Participant[]> = {}
    for (const p of participants) {
      grouped[p.finalRank] = grouped[p.finalRank] || []
      grouped[p.finalRank].push(p)
    }
    const rankAssignments: Array<{
      ushId: number
      userId: number
      rankName: string
      order: number
      seasonRankRewardId?: number
      rewardIds?: number[]
    }> = []

    for (const rankName of rankOrderPriority) {
      const list = (grouped[rankName] || []).sort((a, b) => b.finalElo - a.finalElo)
      let order = 1
      for (const p of list) {
        const found = rewardMap.get(rankName)?.get(order)
        // Collect rewards from ranked position + common rewards for all
        const allRewardIds = [
          ...(found?.rewardIds || []),
          ...commonRewards.flatMap((cr) => (cr.rewards || []).map((r) => r.id))
        ]
        rankAssignments.push({
          ushId: p.ushId,
          userId: p.userId,
          rankName,
          order,
          seasonRankRewardId: found?.id,
          rewardIds: allRewardIds
        })
        order += 1
      }
    }

    // 6) Update USH with seasonRankRewardId and mark rewardsClaimed as CLAIMED
    await this.userSeasonHistoryService.setRankRewardsClaimed(
      rankAssignments.map((ra) => ({
        id: ra.ushId,
        seasonRankRewardId: ra.seasonRankRewardId ?? null
      }))
    )

    // Note: We only link to SeasonRankReward and mark CLAIMED. Actual delivery of rewards
    // (EXP/Coins/Sparkles/Pokemon) can be handled elsewhere by a worker if needed.

    // 7) Reset eloscore for ALL users in the system (not just participants): new = max(0, old - 1000)
    const totalUsers = await this.userCoreService.lowerEloOfAllUsers(1000)

    this.logger.log(
      `[FinalizeSeason] Season ${seasonId} finalized: totalUsers=${totalUsers}, participants=${participants.length}, rewardsAssigned=${rankAssignments.filter((a) => a.seasonRankRewardId).length}`
    )
  }

  /**
   * Clone SeasonRankRewards from source season to new season
   * - if isRandomItemAgain=false: clone same reward ids
   * - if true: re-randomize rewards from pool (EXP, SPARKLES) keeping same structure counts
   */
  private async cloneSeasonRankRewards(
    sourceSeasonId: number,
    targetSeasonId: number,
    seasonRankRewards: {
      rankName: RankName
      order: number | null
      rewards: { id: number }[]
    }[],
    isRandomItemAgain: boolean
  ) {
    if (!seasonRankRewards || seasonRankRewards.length === 0) {
      this.logger.log(
        `[CloneSeasonRankRewards] Source season ${sourceSeasonId} has no rewards to clone`
      )
      return
    }

    // Prepare reward pool if randomization is needed
    let rewardPool: { id: number }[] = []
    if (isRandomItemAgain) {
      rewardPool = await this.rewardService.findIdsByTargets(RANDOM_REWARD_TARGETS)
    }

    // Clone each SeasonRankReward
    for (const item of seasonRankRewards) {
      let rewardIds: number[] = []
      if (!isRandomItemAgain) {
        // Clone same rewards
        rewardIds = (item.rewards || []).map((r) => r.id)
      } else {
        // Random pick based on previous count; ensure at least 1 if pool not empty
        const count = Math.max(1, (item.rewards || []).length || 1)
        if (rewardPool.length > 0) {
          const shuffled = [...rewardPool].sort(() => Math.random() - 0.5)
          rewardIds = shuffled.slice(0, Math.min(count, shuffled.length)).map((r) => r.id)
        } else {
          rewardIds = []
        }
      }

      await this.seasonRankRewardService.createForSeason({
        seasonId: targetSeasonId,
        rankName: item.rankName,
        order: item.order,
        rewardIds
      })
    }

    this.logger.log(
      `[CloneSeasonRankRewards] Cloned ${seasonRankRewards.length} SeasonRankRewards from season ${sourceSeasonId} to ${targetSeasonId}`
    )
  }

  /**
   * Create the next season in PREVIEW based on a template (the just-finalized season).
   * - Dates: start = template.endDate, end = start + duration(template)
   * - Copy translations and config flags
   * - SeasonRankRewards:
   *   - if isRandomItemAgain=false: clone previous rewards
   *   - if true: re-randomize rewards from pool (EXP, SPARKLES) keeping same structure counts
   */
  private async precreateNextSeasonFromTemplate(templateSeasonId: number) {
    const template =
      await this.leaderboardSeasonService.findTemplateForPrecreate(templateSeasonId)
    if (!template) return

    if (!template.enablePrecreate) {
      this.logger.debug(
        `[PrecreateNext] Template season ${templateSeasonId} has enablePrecreate=false, skip`
      )
      return
    }

    if (!template.startDate || !template.endDate) {
      this.logger.warn(
        `[PrecreateNext] Template season ${templateSeasonId} missing dates, skip`
      )
      return
    }

    // Avoid duplicate by checking same newStartDate already exists
    const durationMs = template.endDate.getTime() - template.startDate.getTime()
    const durationDays = Math.max(1, Math.round(durationMs / (24 * 60 * 60 * 1000)))

    const newStartDate = template.endDate
    const newEndDate = addDaysUTC0000(template.endDate, durationDays)

    const exists = await this.leaderboardSeasonService.findPreviewStartingAt(newStartDate)
    if (exists) {
      this.logger.log(
        `[PrecreateNext] Already has PREVIEW season starting ${newStartDate.toISOString()} (id=${exists.id}), skip`
      )
      return
    }

    // Prepare reward pool if randomization is needed
    let rewardPool: { id: number }[] = []
    if (template.isRandomItemAgain) {
      rewardPool = await this.rewardService.findIdsByTargets(RANDOM_REWARD_TARGETS)
    }

    // Transaction: create season, set nameKey + translations, create seasonRankRewards
    await this.leaderboardSeasonService.withTransaction(async (tx) => {
      const timestamp = Date.now()
      const created = await this.leaderboardSeasonService.createSeason(
        {
          nameKey: `leaderboardSeason.name.temp.${timestamp}`,
          startDate: newStartDate,
          endDate: newEndDate,
          status: 'PREVIEW',
          enablePrecreate: template.enablePrecreate,
          precreateBeforeEndDays: template.precreateBeforeEndDays,
          isRandomItemAgain: template.isRandomItemAgain,
          createdById: template.createdById ?? undefined
        },
        tx
      )

      const finalNameKey = `leaderboardSeason.name.${created.id}`
      const upserts = template.nameTranslations.map((t) => ({
        where: { languageId_key: { languageId: t.languageId, key: finalNameKey } },
        update: { value: t.value },
        create: { languageId: t.languageId, key: finalNameKey, value: t.value }
      }))

      await this.leaderboardSeasonService.setNameKeyWithTranslations(
        created.id,
        finalNameKey,
        upserts,
        tx
      )

      // Create SeasonRankRewards for new season
      for (const item of template.seasonRankRewards) {
        // Decide reward ids to connect
        let rewardIds: number[] = []
        if (!template.isRandomItemAgain) {
          // Clone same rewards
          rewardIds = (item.rewards || []).map((r) => r.id)
        } else {
          // Random pick based on previous count; ensure at least 1 if pool not empty
          const count = Math.max(1, (item.rewards || []).length || 1)
          if (rewardPool.length > 0) {
            // sample without replacement up to pool size
            const shuffled = [...rewardPool].sort(() => Math.random() - 0.5)
            rewardIds = shuffled
              .slice(0, Math.min(count, shuffled.length))
              .map((r) => r.id)
          } else {
            rewardIds = []
          }
        }

        await this.seasonRankRewardService.createForSeason(
          { seasonId: created.id, rankName: item.rankName, order: item.order, rewardIds },
          tx
        )
      }

      this.logger.log(
        `[PrecreateNext] Created next season ${created.id} with ${template.seasonRankRewards.length} SeasonRankRewards from template ${template.id} (${finalNameKey})`
      )
    })
  }
}
