import { RewardClaimStatus } from '@/common/constants/reward.constant'
import { I18nService } from '@/i18n/i18n.service'
import { UserSeasonHistoryMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  convertEloToRank,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { HttpStatus, Injectable } from '@nestjs/common'
import { UserRewardSourceType } from '@prisma/client'
import { LanguagesRepo } from '../languages/languages.repo'
import { NotStartedLeaderboardSeasonException } from '../leaderboard-season/dto/leaderboard-season.error'
import { LeaderboardSeasonRepo } from '../leaderboard-season/leaderboard-season.repo'
import { RewardService } from '../reward/reward.service'
import { UserNotFoundException } from '../user/dto/user.error'
import {
  UserCanNotClaimRewardsException,
  UserNotHaveRewardsToClaimException,
  UserSeasonHistoryNotFoundException
} from './dto/user-season-history.error'
import {
  CreateUserSeasonHistoryBodyType,
  UpdateUserSeasonHistoryBodyType
} from './entities/user-season-history.entity'
import { UserSeasonHistoryRepo } from './user-season-history.repo'

@Injectable()
export class UserSeasonHistoryService {
  constructor(
    private userSeasonHistoryRepo: UserSeasonHistoryRepo,
    private readonly leaderboardSeasonRepo: LeaderboardSeasonRepo,
    private readonly rewardService: RewardService,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepo,
    private readonly sharedUserRepo: SharedUserRepository
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.userSeasonHistoryRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(UserSeasonHistoryMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const userSeasonHistory = await this.userSeasonHistoryRepo.findById(id)
    if (!userSeasonHistory) {
      throw new UserSeasonHistoryNotFoundException()
    }

    return {
      statusCode: 200,
      data: userSeasonHistory,
      message: this.i18nService.translate(UserSeasonHistoryMessage.GET_LIST_SUCCESS, lang)
    }
  }
  async joinSeason({ userId }: { userId: number }, lang: string = 'vi') {
    try {
      const langId = await this.languageRepo.getIdByCode(lang)
      if (!langId) {
        throw new NotFoundRecordException()
      }
      // lay season hien tai
      const currentSeason = await this.leaderboardSeasonRepo.findActiveSeason()
      if (!currentSeason) {
        throw new NotStartedLeaderboardSeasonException()
      }

      const preSeason =
        await this.userSeasonHistoryRepo.getInfoPreSeaonUserSeasonHistory(userId)
      const infoSeasonNow = await this.leaderboardSeasonRepo.findByIdWithLangId(
        currentSeason.id,
        false,
        langId
      )
      if (!infoSeasonNow) {
        throw new NotFoundRecordException()
      }

      const userInfo = await this.sharedUserRepo.findUnique({ id: userId })
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
      return {
        statusCode: 201,
        data: { preSeasonInfo: dataPreSeason, seasonNowInfo: dataSeasonNow },
        message: this.i18nService.translate(UserSeasonHistoryMessage.CREATE_SUCCESS, lang)
      }
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

  async create(
    { userId, data }: { userId: number; data: CreateUserSeasonHistoryBodyType },
    lang: string = 'vi'
  ) {
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
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(UserSeasonHistoryMessage.CREATE_SUCCESS, lang)
      }
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

  async update(
    {
      id,
      data,
      userId
    }: {
      id: number
      data: UpdateUserSeasonHistoryBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
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
      return {
        statusCode: 200,
        data: userSeasonHistory,
        message: this.i18nService.translate(UserSeasonHistoryMessage.UPDATE_SUCCESS, lang)
      }
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

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existUserSeasonHistory = await this.userSeasonHistoryRepo.findById(id)
      if (!existUserSeasonHistory) {
        throw new UserSeasonHistoryNotFoundException()
      }

      await this.userSeasonHistoryRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(UserSeasonHistoryMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserSeasonHistoryNotFoundException()
      }
      throw error
    }
  }

  async getUserHisByUserId(userId: number, lang: string = 'vi') {
    const userSeasonHistory =
      await this.userSeasonHistoryRepo.findSeasonNowByUserId(userId)
    return {
      statusCode: 200,
      data: userSeasonHistory,
      message: this.i18nService.translate(UserSeasonHistoryMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async getReward({ id, userId }: { id: number; userId: number }, lang: string = 'vi') {
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

      // 4. Check if user has rewards to claim
      if (!userSeasonHistory.seasonRankRewardId) {
        throw new UserNotHaveRewardsToClaimException()
      }

      // 5. Get season rank reward with all rewards
      const seasonRankReward =
        await this.userSeasonHistoryRepo.findSeasonRankRewardWithRewards(
          userSeasonHistory.seasonRankRewardId
        )

      if (
        !seasonRankReward ||
        !seasonRankReward.rewards ||
        seasonRankReward.rewards.length === 0
      ) {
        throw new UserNotHaveRewardsToClaimException()
      }

      // 6. Extract reward IDs
      const rewardIds = seasonRankReward.rewards.map((r: any) => r.id)

      // 7. Convert and give rewards to user
      const rewardResults = await this.rewardService.convertRewardsWithUser(
        rewardIds,
        userId,
        UserRewardSourceType.SEASON_REWARD
      )

      // 8. Update status to COMPLETED (already collected)
      await this.userSeasonHistoryRepo.update({
        id,
        data: {
          rewardsClaimed: RewardClaimStatus.COMPLETED
        },
        updatedById: userId
      })

      return {
        statusCode: HttpStatus.OK,
        data: rewardResults,
        message: this.i18nService.translate(
          UserSeasonHistoryMessage.GET_REWARD_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserSeasonHistoryNotFoundException()
      }
      throw error
    }
  }
}
