import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GetUserSeasonHistoryDetailSchema,
  UserSeasonHistorySchema
} from '../entities/user-season-history.entity'

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

export type CreateUserSeasonHistoryBody = z.infer<
  typeof CreateUserSeasonHistoryBodySchema
>

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

export type UpdateUserSeasonHistoryBody = z.infer<
  typeof UpdateUserSeasonHistoryBodySchema
>

export const UpdateUserSeasonHistoryResSchema = CreateUserSeasonHistoryResSchema

export const UpdateWithListItemResSchema = resSchema(z.array(UserSeasonHistorySchema))

// Query Schema

export const GetUserSeasonHistoryParamsSchema = z.object({
  userSeasonHistoryId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export type GetUserSeasonHistoryParams = z.infer<typeof GetUserSeasonHistoryParamsSchema>

export const GetRewardByLeaderboardParamsSchema = z.object({
  leaderboardSeasonId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetUserSeasonHistoryDetailResSchema = resSchema(
  GetUserSeasonHistoryDetailSchema
)
