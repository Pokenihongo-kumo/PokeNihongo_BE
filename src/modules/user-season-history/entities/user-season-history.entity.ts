import { RewardClaimStatus } from '@/common/constants/reward.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
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

// Create Schema
export const CreateUserSeasonHistoryBodySchema = UserSeasonHistorySchema.pick({
  seasonId: true,
  finalElo: true
})
  .extend({
    userId: z.number().optional(),
    finalRank: z.string().default('')
  })
  .strict()

export const CreateUserSeasonHistoryResSchema = resSchema(UserSeasonHistorySchema)

// Update Schema
export const UpdateUserSeasonHistoryBodySchema = UserSeasonHistorySchema.pick({
  seasonId: true,
  finalElo: true,
  finalRank: true,
  seasonRankRewardId: true,
  rewardsClaimed: true
})
  .partial()
  .strict()

export const UpdateUserSeasonHistoryResSchema = CreateUserSeasonHistoryResSchema

export const UpdateWithListItemResSchema = resSchema(z.array(UserSeasonHistorySchema))

// Query Schema
export const GetUserSeasonHistoryParamsSchema = z.object({
  userSeasonHistoryId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetRewardByLeaderboardParamsSchema = z.object({
  leaderboardSeasonId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetUserSeasonHistoryDetailSchema = UserSeasonHistorySchema

export const GetUserSeasonHistoryDetailResSchema = resSchema(
  GetUserSeasonHistoryDetailSchema
)

// Type exports
export type UserSeasonHistoryType = z.infer<typeof UserSeasonHistorySchema>
export type CreateUserSeasonHistoryBodyType = z.infer<
  typeof CreateUserSeasonHistoryBodySchema
>
export type UpdateUserSeasonHistoryBodyType = z.infer<
  typeof UpdateUserSeasonHistoryBodySchema
>
export type GetUserSeasonHistoryParamsType = z.infer<
  typeof GetUserSeasonHistoryParamsSchema
>

// Field for query
export type UserSeasonHistoryFieldType = keyof z.infer<typeof UserSeasonHistorySchema>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  UserSeasonHistorySchema.shape
) as UserSeasonHistoryFieldType[]
