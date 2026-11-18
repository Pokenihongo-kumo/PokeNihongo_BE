import { rankName } from '@/common/constants/season-rank-constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base SeasonRankReward Schema
export const SeasonRankRewardSchema = z.object({
  id: z.number(),
  seasonId: z.number(),
  // Align with Prisma enum RankName: N5 | N4 | N3 | N2 | N1
  rankName: z.enum([rankName.N5, rankName.N4, rankName.N3]).default(rankName.N5),
  order: z.number().min(1).nullable(),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateSeasonRankRewardBodySchema = SeasonRankRewardSchema.pick({
  seasonId: true,
  rankName: true,
  order: true
})

  .strict()

export const CreateSeasonRankRewardResSchema = resSchema(SeasonRankRewardSchema)

// Update Schema
export const UpdateSeasonRankRewardBodySchema =
  CreateSeasonRankRewardBodySchema.partial().strict()

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

export type UpdateWithListSeasonRankRewardBodyType = z.infer<
  typeof UpdateWithListItemBodySchema
>

export const UpdateWithListItemResSchema = resSchema(z.array(SeasonRankRewardSchema))

// Query Schema
export const GetSeasonRankRewardParamsSchema = z.object({
  seasonRankRewardId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetSeasonRankRewardDetailSchema = SeasonRankRewardSchema

export const GetSeasonRankRewardDetailResSchema = resSchema(
  GetSeasonRankRewardDetailSchema
)

// Type exports
export type SeasonRankRewardType = z.infer<typeof SeasonRankRewardSchema>
export type CreateSeasonRankRewardBodyType = z.infer<
  typeof CreateSeasonRankRewardBodySchema
>
export type UpdateSeasonRankRewardBodyType = z.infer<
  typeof UpdateSeasonRankRewardBodySchema
>
export type GetSeasonRankRewardParamsType = z.infer<
  typeof GetSeasonRankRewardParamsSchema
>

export type UpdateWithListItemBodySchemaType = z.infer<
  typeof UpdateWithListItemBodySchema
>
// Field for query
export type SeasonRankRewardFieldType = keyof z.infer<typeof SeasonRankRewardSchema>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  SeasonRankRewardSchema.shape
) as SeasonRankRewardFieldType[]
