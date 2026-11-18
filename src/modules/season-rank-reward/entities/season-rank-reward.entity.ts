import { rankName } from '@/common/constants/season-rank-constant'
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

export const GetSeasonRankRewardDetailSchema = SeasonRankRewardSchema

// Type exports
export type SeasonRankReward = z.infer<typeof SeasonRankRewardSchema>
// Field for query
export type SeasonRankRewardFieldType = keyof z.infer<typeof SeasonRankRewardSchema>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  SeasonRankRewardSchema.shape
) as SeasonRankRewardFieldType[]
