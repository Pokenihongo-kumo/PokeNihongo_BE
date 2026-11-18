import { MatchRoundParticipantStatus } from '@/common/constants/match.constant'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base MatchRoundParticipant Schema
export const MatchRoundParticipantSchema = z.object({
  id: z.number(),
  matchParticipantId: z.number(),
  matchRoundId: z.number(),
  orderSelected: z.number().default(1),
  endTimeSelected: z.date().nullable(),
  selectedUserPokemonId: z.number().nullable(),
  points: z.number().nullable(),
  totalTimeMs: z.number().nullable(),
  questionsTotal: z.number(),
  status: z
    .enum([
      MatchRoundParticipantStatus.SELECTING_POKEMON,
      MatchRoundParticipantStatus.PENDING,
      MatchRoundParticipantStatus.IN_PROGRESS,
      MatchRoundParticipantStatus.COMPLETED
    ])
    .default(MatchRoundParticipantStatus.SELECTING_POKEMON),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const GetMatchRoundParticipantDetailSchema = MatchRoundParticipantSchema

// Type exports
export type MatchRoundParticipant = z.infer<typeof MatchRoundParticipantSchema>
// Field for query
export type MatchRoundParticipantFieldType = keyof z.infer<
  typeof MatchRoundParticipantSchema
>
export const MATCH_PARTICIPANT_FIELDS = Object.keys(
  MatchRoundParticipantSchema.shape
) as MatchRoundParticipantFieldType[]
