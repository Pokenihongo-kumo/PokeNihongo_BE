import { SeasonRankRewardService } from '@/modules/season-rank-reward/season-rank-reward.service'
import { RewardClaimStatus } from '@/common/constants/reward.constant'
import { LanguagesService } from '@/modules/languages/languages.service'
import { LeaderboardSeasonService } from '@/modules/leaderboard-season/leaderboard-season.service'
import { UserCoreService } from '@/modules/user/user-core.service'
import { NotFoundRecordException } from '@/shared/error'
import {
  convertEloToRank,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { UserRewardSourceType } from '@prisma/client'
import { NotStartedLeaderboardSeasonException } from '../leaderboard-season/dto/leaderboard-season.error'
import { RewardService } from '../reward/reward.service'
import { UserNotFoundException } from '../user/dto/user.error'
import {
  UserCanNotClaimRewardsException,
  UserNotHaveRewardsToClaimException,
  UserSeasonHistoryNotFoundException
} from './dto/user-season-history.error'
import {
  CreateUserSeasonHistoryBody,
  UpdateUserSeasonHistoryBody
} from './dto/user-season-history.zod-dto'
import { UserSeasonHistoryRepo } from './user-season-history.repo'

@Injectable()
export class UserSeasonHistoryService {
  constructor(
    private userSeasonHistoryRepo: UserSeasonHistoryRepo,
    private readonly leaderboardSeasonService: LeaderboardSeasonService,
    private readonly rewardService: RewardService,
    private readonly languagesService: LanguagesService,
    private readonly userCoreService: UserCoreService,
    private readonly seasonRankRewardService: SeasonRankRewardService
  ) {}

  async list(pagination: PaginationQuery) {
    const data = await this.userSeasonHistoryRepo.list(pagination)
    return data
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number) {
    const userSeasonHistory = await this.userSeasonHistoryRepo.findById(id)
    if (!userSeasonHistory) {
      throw new UserSeasonHistoryNotFoundException()
    }

    return userSeasonHistory
  }
  async joinSeason({ userId }: { userId: number }, lang: string = 'vi') {
    try {
      const langId = await this.languagesService.getIdByCode(lang)
      if (!langId) {
        throw new NotFoundRecordException()
      }
      // lay season hien tai
      const currentSeason = await this.leaderboardSeasonService.findActiveSeason()
      if (!currentSeason) {
        throw new NotStartedLeaderboardSeasonException()
      }

      const preSeason =
        await this.userSeasonHistoryRepo.getInfoPreSeaonUserSeasonHistory(userId)
      const infoSeasonNow = await this.leaderboardSeasonService.findByIdWithLangId(
        currentSeason.id,
        false,
        langId
      )
      if (!infoSeasonNow) {
        throw new NotFoundRecordException()
      }

      const userInfo = await this.userCoreService.findUnique({ id: userId })
      if (!userInfo) {
        throw new UserNotFoundException()
      }
      // create current season history entry
      const result = await this.userSeasonHistoryRepo.create({
        createdById: userId,
        data: {
          userId,
          seasonId: currentSeason.id,
          finalElo: null,
          finalRank: ''
        }
      })

      const dataPreSeason = preSeason
        ? {
            finalElo: preSeason.finalElo,
            finalRank: preSeason.finalRank
          }
        : null
      const currentTranslation = ((infoSeasonNow as any).nameTranslations || []).find(
        (t: any) => t.languageId === langId
      )
      const dataSeasonNow = {
        seasonId: infoSeasonNow.id,
        startDate: infoSeasonNow.startDate,
        endDate: infoSeasonNow.endDate,
        nameTranslation: currentTranslation?.value ?? null,
        newElo: userInfo.eloscore || 0,
        newRank: convertEloToRank(userInfo.eloscore || 0)
      }
      return { preSeasonInfo: dataPreSeason, seasonNowInfo: dataSeasonNow }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async create({ userId, data }: { userId: number; data: CreateUserSeasonHistoryBody }) {
    try {
      // check coi co truyen userId ko, neu ko thi lay cua created_by
      data.userId = data.userId || userId

      const rankName = convertEloToRank(data.finalElo || 0)
      data.finalRank = rankName

      const result = await this.userSeasonHistoryRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return result
    } catch (error) {
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
    data: UpdateUserSeasonHistoryBody
    userId?: number
  }) {
    try {
      if (data.finalElo !== undefined) {
        const rankName = convertEloToRank(data.finalElo || 0)
        data.finalRank = rankName
      }
      const userSeasonHistory = await this.userSeasonHistoryRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return userSeasonHistory
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserSeasonHistoryNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }) {
    try {
      const existUserSeasonHistory = await this.userSeasonHistoryRepo.findById(id)
      if (!existUserSeasonHistory) {
        throw new UserSeasonHistoryNotFoundException()
      }

      await this.userSeasonHistoryRepo.delete(id)
      return
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserSeasonHistoryNotFoundException()
      }
      throw error
    }
  }

  async getUserHisByUserId(userId: number) {
    const userSeasonHistory =
      await this.userSeasonHistoryRepo.findSeasonNowByUserId(userId)
    // not joined yet: a 404 (the serializer used to turn null into a 500)
    if (!userSeasonHistory) {
      throw new UserSeasonHistoryNotFoundException()
    }
    return userSeasonHistory
  }

  async getReward({ id, userId }: { id: number; userId: number }) {
    try {
      // 1. Fetch user season history with reward details
      const userSeasonHistory = await this.userSeasonHistoryRepo.findById(id)

      if (!userSeasonHistory) {
        throw new UserSeasonHistoryNotFoundException()
      }

      // 2. Verify ownership
      if (userSeasonHistory.userId !== userId) {
        throw new NotFoundRecordException()
      }

      // 3. Check if rewards are ready to claim (CLAIMED = finalized but not collected yet)
      if (userSeasonHistory.rewardsClaimed !== RewardClaimStatus.CLAIMED) {
        throw new UserCanNotClaimRewardsException()
      }

      // 4. Rewards of the rank position (if any), plus the season rewards for
      //    everyone (rank rewards with order null)
      const seasonRankReward = userSeasonHistory.seasonRankRewardId
        ? await this.userSeasonHistoryRepo.findSeasonRankRewardWithRewards(
            userSeasonHistory.seasonRankRewardId
          )
        : null
      const commonRewardIds = (
        await this.seasonRankRewardService.findBySeasonWithRewardIds(
          userSeasonHistory.seasonId
        )
      )
        .filter((srr) => srr.order === null)
        .flatMap((srr) => srr.rewards.map((r) => r.id))
      const rewardIds = [
        ...(seasonRankReward?.rewards ?? []).map((r: any) => r.id),
        ...commonRewardIds
      ]

      if (rewardIds.length === 0) {
        throw new UserNotHaveRewardsToClaimException()
      }

      // 5. Convert and give rewards to user
      const rewardResults = await this.rewardService.convertRewardsWithUser(
        rewardIds,
        userId,
        UserRewardSourceType.SEASON_REWARD
      )

      // 6. Update status to COMPLETED (already collected)
      await this.userSeasonHistoryRepo.update({
        id,
        data: {
          rewardsClaimed: RewardClaimStatus.COMPLETED
        },
        updatedById: userId
      })

      return rewardResults
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserSeasonHistoryNotFoundException()
      }
      throw error
    }
  }

  // ---- Season cronjob ----

  setFinalResults(...args: Parameters<UserSeasonHistoryRepo['setFinalResults']>) {
    return this.userSeasonHistoryRepo.setFinalResults(...args)
  }

  setRankRewardsClaimed(
    ...args: Parameters<UserSeasonHistoryRepo['setRankRewardsClaimed']>
  ) {
    return this.userSeasonHistoryRepo.setRankRewardsClaimed(...args)
  }
}
