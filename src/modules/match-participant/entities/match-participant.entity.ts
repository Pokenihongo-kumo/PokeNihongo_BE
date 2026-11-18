import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
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

// Create Schema
export const CreateMatchParticipantBodySchema = MatchParticipantSchema.pick({
  matchId: true,
  userId: true
}).strict()

export const CreateMatchParticipantResSchema = resSchema(MatchParticipantSchema)

// Update Schema
export const UpdateMatchParticipantBodySchema = CreateMatchParticipantBodySchema.extend({
  hasAccepted: z.boolean().nullable()
})
  .partial()
  .strict()

export const UpdateMatchParticipantResSchema = CreateMatchParticipantResSchema

export const UpdateWithListItemResSchema = resSchema(z.array(MatchParticipantSchema))

// Query Schema
export const GetMatchParticipantParamsSchema = z.object({
  matchParticipantId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetMatchParticipantDetailSchema = MatchParticipantSchema

export const GetMatchParticipantDetailResSchema = resSchema(
  GetMatchParticipantDetailSchema
)

// Type exports
export type MatchParticipantType = z.infer<typeof MatchParticipantSchema>
export type CreateMatchParticipantBodyType = z.infer<
  typeof CreateMatchParticipantBodySchema
>
export type UpdateMatchParticipantBodyType = z.infer<
  typeof UpdateMatchParticipantBodySchema
>
export type GetMatchParticipantParamsType = z.infer<
  typeof GetMatchParticipantParamsSchema
>

// Field for query
export type MatchParticipantFieldType = keyof z.infer<typeof MatchParticipantSchema>
export const MATCH_PARTICIPANT_FIELDS = Object.keys(
  MatchParticipantSchema.shape
) as MatchParticipantFieldType[]
