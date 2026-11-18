import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GetMatchRoundParticipantDetailSchema,
  MatchRoundParticipantSchema
} from '../entities/match-round-participant.entity'

// Create Schema

export const CreateMatchRoundParticipantBodySchema = MatchRoundParticipantSchema.pick({
  matchParticipantId: true,
  matchRoundId: true,
  selectedUserPokemonId: true
}).strict()

export type CreateMatchRoundParticipantBody = z.infer<
  typeof CreateMatchRoundParticipantBodySchema
>

export const CreateMatchRoundParticipantResSchema = resSchema(MatchRoundParticipantSchema)

// Update Schema

export const UpdateMatchRoundParticipantBodySchema = MatchRoundParticipantSchema.pick({
  matchParticipantId: true,
  matchRoundId: true,
  selectedUserPokemonId: true,
  endTimeSelected: true,
  status: true
})
  .partial()
  .strict()

export type UpdateMatchRoundParticipantBody = z.infer<
  typeof UpdateMatchRoundParticipantBodySchema
>

export const ChoosePokemonMatchRoundParticipantBodySchema = z.object({
  pokemonId: z.number()
})

export type ChoosePokemonMatchRoundParticipantBody = z.infer<
  typeof ChoosePokemonMatchRoundParticipantBodySchema
>

export const UpdateMatchRoundParticipantResSchema = CreateMatchRoundParticipantResSchema

export const UpdateWithListItemResSchema = resSchema(z.array(MatchRoundParticipantSchema))

// Query Schema

export const GetMatchRoundParticipantParamsSchema = z.object({
  matchRoundParticipantId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export type GetMatchRoundParticipantParams = z.infer<
  typeof GetMatchRoundParticipantParamsSchema
>

export const GetMatchRoundParticipantByRoundParamsSchema = z.object({
  matchRoundId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetMatchRoundParticipantDetailResSchema = resSchema(
  GetMatchRoundParticipantDetailSchema
)
