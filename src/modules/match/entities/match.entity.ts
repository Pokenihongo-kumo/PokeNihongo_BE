import { MatchStatus } from '@/common/constants/match.constant'
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

export type Match = z.infer<typeof MatchSchema>

type MatchFieldType = keyof z.infer<typeof MatchSchema>
export const MATCH_FIELDS = [...Object.keys(MatchSchema.shape)] as MatchFieldType[]
