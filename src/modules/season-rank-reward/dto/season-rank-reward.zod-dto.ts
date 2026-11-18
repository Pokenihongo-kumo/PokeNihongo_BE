import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GetSeasonRankRewardDetailSchema,
  SeasonRankRewardSchema
} from '../entities/season-rank-reward.entity'

// Create Schema

export const CreateSeasonRankRewardBodySchema = SeasonRankRewardSchema.pick({
  seasonId: true,
  rankName: true,
  order: true
})

  .strict()

export type CreateSeasonRankRewardBody = z.infer<typeof CreateSeasonRankRewardBodySchema>

export const CreateSeasonRankRewardResSchema = resSchema(SeasonRankRewardSchema)

// Update Schema

export const UpdateSeasonRankRewardBodySchema =
  CreateSeasonRankRewardBodySchema.partial().strict()

export type UpdateSeasonRankRewardBody = z.infer<typeof UpdateSeasonRankRewardBodySchema>

export const UpdateSeasonRankRewardResSchema = CreateSeasonRankRewardResSchema

// Update multiple items: { seasonId, items: [{ rankType, rewards: [...] }] }

export const UpdateSeasonRankRewardByRankTypeSchema = z.object({
  rankName: SeasonRankRewardSchema.shape.rankName,
  infoOrders: z
    .array(
      z.object({
        order: z.number().min(1).nullable(),
        rewards: z.array(z.number()) // Allow empty array for auto-created null-order rewards
      })
    )
    .min(1)
})

export const UpdateWithListItemBodySchema = z.object({
  seasonId: z.number(),
  items: z.array(UpdateSeasonRankRewardByRankTypeSchema)
})

export type UpdateWithListSeasonRankRewardBody = z.infer<
  typeof UpdateWithListItemBodySchema
>

export type UpdateWithListItemBody = z.infer<typeof UpdateWithListItemBodySchema>

export const UpdateWithListItemResSchema = resSchema(z.array(SeasonRankRewardSchema))

// Query Schema

export const GetSeasonRankRewardParamsSchema = z.object({
  seasonRankRewardId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export type GetSeasonRankRewardParams = z.infer<typeof GetSeasonRankRewardParamsSchema>

export const GetSeasonRankRewardDetailResSchema = resSchema(
  GetSeasonRankRewardDetailSchema
)
