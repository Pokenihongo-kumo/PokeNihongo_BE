import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GetMatchParticipantDetailSchema,
  MatchParticipantSchema
} from '../entities/match-participant.entity'

// Create Schema

export const CreateMatchParticipantBodySchema = MatchParticipantSchema.pick({
  matchId: true,
  userId: true
}).strict()

export type CreateMatchParticipantBody = z.infer<typeof CreateMatchParticipantBodySchema>

export const CreateMatchParticipantResSchema = resSchema(MatchParticipantSchema)

// Update Schema

export const UpdateMatchParticipantBodySchema = CreateMatchParticipantBodySchema.extend({
  hasAccepted: z.boolean().nullable()
})
  .partial()
  .strict()

export type UpdateMatchParticipantBody = z.infer<typeof UpdateMatchParticipantBodySchema>

// Query Schema

export const GetMatchParticipantParamsSchema = z.object({
  matchParticipantId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetMatchParticipantDetailResSchema = resSchema(
  GetMatchParticipantDetailSchema
)
