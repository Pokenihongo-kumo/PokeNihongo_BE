import { MatchStatus } from '@/common/constants/match.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { MatchMessage } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const MatchSchema = z.object({
  id: z.number(),
  status: z
    .enum([
      MatchStatus.PENDING,
      MatchStatus.IN_PROGRESS,
      MatchStatus.COMPLETED,
      MatchStatus.CANCELLED
    ])
    .default(MatchStatus.PENDING),
  leaderboardSeasonId: z.number(),
  winnerId: z.number().nullable(),
  eloGained: z.number().nullable(),
  eloLost: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateMatchBodySchema = MatchSchema.pick({})

  .strict()

export const CreateMatchResSchema = resSchema(MatchSchema)

export const UpdateMatchBodySchema = CreateMatchBodySchema.partial().strict()

export const UpdateMatchResSchema = CreateMatchResSchema

export const GetMatchParamsSchema = z
  .object({
    matchId: checkIdSchema(MatchMessage.INVALID_DATA)
  })
  .strict()

export const GetMatchDetailWithAllLangResSchema = resSchema(MatchSchema)

export const GetMatchDetailResSchema = resSchema(MatchSchema)

export type MatchType = z.infer<typeof MatchSchema>

export type CreateMatchBodyType = z.infer<typeof CreateMatchBodySchema>

export type UpdateMatchBodyType = z.infer<typeof UpdateMatchBodySchema>
export type GetMatchParamsType = z.infer<typeof GetMatchParamsSchema>
export type GetMatchDetailResType = z.infer<typeof GetMatchDetailResSchema>

type MatchFieldType = keyof z.infer<typeof MatchSchema>
export const MATCH_FIELDS = [...Object.keys(MatchSchema.shape)] as MatchFieldType[]
