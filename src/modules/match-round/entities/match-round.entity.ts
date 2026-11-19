import { MatchRoundNumber, RoundStatus } from '@/common/constants/match.constant'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const MatchRoundSchema = z.object({
  id: z.number(),
  matchId: z.number(),
  roundNumber: z
    .enum([MatchRoundNumber.ONE, MatchRoundNumber.TWO, MatchRoundNumber.THREE])
    .default(MatchRoundNumber.ONE),
  status: z
    .enum([
      RoundStatus.SELECTING_POKEMON,
      RoundStatus.PENDING,
      RoundStatus.IN_PROGRESS,
      RoundStatus.COMPLETED
    ])
    .default(RoundStatus.SELECTING_POKEMON),
  endTimeRound: z.date().nullable(),
  roundWinnerId: z.number().optional().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type MatchRound = z.infer<typeof MatchRoundSchema>

type MatchRoundFieldType = keyof z.infer<typeof MatchRoundSchema>
export const MATCH_FIELDS = [
  ...Object.keys(MatchRoundSchema.shape)
] as MatchRoundFieldType[]
