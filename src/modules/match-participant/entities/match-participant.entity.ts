import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base MatchParticipant Schema
export const MatchParticipantSchema = z.object({
  id: z.number(),
  matchId: z.number(),
  userId: z.number(),
  hasAccepted: z.boolean().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const GetMatchParticipantDetailSchema = MatchParticipantSchema

// Type exports
export type MatchParticipant = z.infer<typeof MatchParticipantSchema>
// Field for query
export type MatchParticipantFieldType = keyof z.infer<typeof MatchParticipantSchema>
export const MATCH_PARTICIPANT_FIELDS = Object.keys(
  MatchParticipantSchema.shape
) as MatchParticipantFieldType[]
