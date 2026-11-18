import { RewardClaimStatus } from '@/common/constants/reward.constant'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base UserSeasonHistory Schema
export const UserSeasonHistorySchema = z.object({
  id: z.number(),
  userId: z.number(),
  seasonId: z.number(),
  finalElo: z.number().nullable(),
  finalRank: z.string().nullable(),
  seasonRankRewardId: z.number().nullable(),
  rewardsClaimed: z
    .enum([
      RewardClaimStatus.CLAIMED,
      RewardClaimStatus.COMPLETED,
      RewardClaimStatus.PENDING
    ])
    .default(RewardClaimStatus.PENDING),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const GetUserSeasonHistoryDetailSchema = UserSeasonHistorySchema

// Type exports
export type UserSeasonHistory = z.infer<typeof UserSeasonHistorySchema>
// Field for query
export type UserSeasonHistoryFieldType = keyof z.infer<typeof UserSeasonHistorySchema>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  UserSeasonHistorySchema.shape
) as UserSeasonHistoryFieldType[]
