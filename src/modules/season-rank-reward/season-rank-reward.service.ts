import { LeaderboardSeasonService } from '@/modules/leaderboard-season/leaderboard-season.service'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import {
  LeaderboardSeasonHasActiveException,
  LeaderboardSeasonHasOpenedException
} from '../leaderboard-season/dto/leaderboard-season.error'
import {
  MissingSeasonRankRewardOrderInvalidException,
  SeasonRankRewardNotFoundException,
  SeasonRnakRewardNameInvalidException,
  SeasonRnakRewardOrderInvalidException
} from './dto/season-rank-reward.error'
import {
  CreateSeasonRankRewardBody,
  UpdateSeasonRankRewardBody,
  UpdateWithListItemBody
} from './dto/season-rank-reward.zod-dto'
import { SeasonRankRewardRepo } from './season-rank-reward.repo'

@Injectable()
export class SeasonRankRewardService {
  constructor(
    private seasonRankRewardRepo: SeasonRankRewardRepo,
    private readonly leaderboardSeasonService: LeaderboardSeasonService
  ) {}

  async list(pagination: PaginationQuery) {
    const data = await this.seasonRankRewardRepo.list(pagination)
    return data
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number) {
    const seasonRankReward = await this.seasonRankRewardRepo.findById(id)
    if (!seasonRankReward) {
      throw new SeasonRankRewardNotFoundException()
    }

    return seasonRankReward
  }

  async create({ userId, data }: { userId: number; data: CreateSeasonRankRewardBody }) {
    try {
      const result = await this.seasonRankRewardRepo.create({
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
    data: UpdateSeasonRankRewardBody
    userId?: number
  }) {
    try {
      const seasonRankReward = await this.seasonRankRewardRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return seasonRankReward
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new SeasonRankRewardNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async updateByList({
    updatedById,
    data
  }: {
    updatedById: number
    data: UpdateWithListItemBody
  }) {
    // Adapted from gacha-item batch update pattern: delete → validate → create
    try {
      const created = await this.seasonRankRewardRepo.withTransaction(async (tx) => {
        const { seasonId, items } = data

        //season active chua ? ko dc update
        const season = await this.leaderboardSeasonService.getById(seasonId)
        if (!season) {
          throw new NotFoundRecordException()
        }
        if (season.status === 'ACTIVE') {
          throw new LeaderboardSeasonHasActiveException()
        }

        if (season.hasOpened === true) {
          throw new LeaderboardSeasonHasOpenedException()
        }

        // 1. Delete existing season rank rewards for seasonId
        await this.seasonRankRewardRepo.deleteBySeason(seasonId, tx)

        // 2. Validate items: rankName uniqueness + order uniqueness and continuity per rankName
        const seenRankNames = new Set<string>()
        const processedItems: Array<{
          rankName: any
          infoOrders: Array<{ order: number | null; rewards: number[] }>
        }> = []

        for (const rankGroup of items) {
          const { rankName, infoOrders } = rankGroup
          if (seenRankNames.has(rankName)) {
            throw new SeasonRnakRewardNameInvalidException()
          }
          seenRankNames.add(rankName)

          // Sort infoOrders: non-null orders ascending, null at the end
          const sortedInfoOrders = [...infoOrders].sort((a, b) => {
            if (a.order === null && b.order === null) return 0
            if (a.order === null) return 1
            if (b.order === null) return -1
            return a.order - b.order
          })

          // Check that last item is null (reward for all), auto-create if missing
          if (sortedInfoOrders.length > 0) {
            const lastItem = sortedInfoOrders[sortedInfoOrders.length - 1]
            if (lastItem.order !== null) {
              // Auto-create null-order reward with empty rewards array
              sortedInfoOrders.push({ order: null, rewards: [] })
            }
          } else {
            // If no infoOrders at all, create one with null order
            sortedInfoOrders.push({ order: null, rewards: [] })
          }

          // Validate non-null orders: uniqueness, start at 1, continuous
          const nonNullOrders: number[] = []
          const seenOrders = new Set<number>()

          for (const info of sortedInfoOrders) {
            if (info.order !== null) {
              if (seenOrders.has(info.order)) {
                throw new SeasonRnakRewardOrderInvalidException()
              }
              seenOrders.add(info.order)
              nonNullOrders.push(info.order)
            }
          }

          // Enforce orders start at 1 and are continuous: 1,2,3,... without gaps
          if (nonNullOrders.length > 0) {
            const maxOrder = Math.max(...nonNullOrders)
            // must contain exactly 1..maxOrder
            for (let i = 1; i <= maxOrder; i++) {
              if (!seenOrders.has(i)) {
                throw new MissingSeasonRankRewardOrderInvalidException(
                  `: ${rankName}-${i}`
                )
              }
            }
          }

          // Store processed items with auto-added null orders
          processedItems.push({
            rankName,
            infoOrders: sortedInfoOrders
          })
        }

        // 3. Validate reward IDs and create rows with reward connections
        const allRewardIds = new Set<number>()
        for (const group of processedItems) {
          for (const info of group.infoOrders) {
            info.rewards.forEach((rid) => allRewardIds.add(rid))
          }
        }

        if (allRewardIds.size > 0) {
          const rewards = await this.seasonRankRewardRepo.findRewardIds(
            Array.from(allRewardIds),
            tx
          )
          const found = new Set(rewards.map((r) => r.id))
          for (const rid of allRewardIds) {
            if (!found.has(rid)) throw new NotFoundRecordException()
          }
        }

        // Create each SeasonRankReward with nested reward connects (including auto-added null orders)
        for (const rankGroup of processedItems) {
          for (const info of rankGroup.infoOrders) {
            await this.seasonRankRewardRepo.createWithRewards(
              {
                seasonId,
                rankName: rankGroup.rankName,
                order: info.order,
                rewardIds: info.rewards,
                updatedById
              },
              tx
            )
          }
        }

        // 4. Re-fetch created data (simple list by seasonId)
        return await this.seasonRankRewardRepo.listBySeason(seasonId, tx)
      })

      return created
    } catch (error) {
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }) {
    try {
      const existSeasonRankReward = await this.seasonRankRewardRepo.findById(id)
      if (!existSeasonRankReward) {
        throw new SeasonRankRewardNotFoundException()
      }

      await this.seasonRankRewardRepo.delete(id)
      return
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new SeasonRankRewardNotFoundException()
      }
      throw error
    }
  }

  // ---- Season cronjob ----

  findBySeasonWithRewardIds(
    ...args: Parameters<SeasonRankRewardRepo['findBySeasonWithRewardIds']>
  ) {
    return this.seasonRankRewardRepo.findBySeasonWithRewardIds(...args)
  }

  createForSeason(...args: Parameters<SeasonRankRewardRepo['createForSeason']>) {
    return this.seasonRankRewardRepo.createForSeason(...args)
  }
}
