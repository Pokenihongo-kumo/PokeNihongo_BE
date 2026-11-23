import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  ChoosePokemonMatchRoundParticipantBodySchema,
  CreateMatchRoundParticipantBodySchema,
  CreateMatchRoundParticipantResSchema,
  GetMatchRoundParticipantByRoundParamsSchema,
  GetMatchRoundParticipantDetailResSchema,
  GetMatchRoundParticipantParamsSchema,
  UpdateMatchRoundParticipantBodySchema,
  UpdateMatchRoundParticipantResSchema
} from './match-round-participant.zod-dto'

// Request DTOs
export type CreateMatchRoundParticipantBody = z.infer<
  typeof CreateMatchRoundParticipantBodySchema
>

export class CreateMatchRoundParticipantBodyDTO extends createZodDto(
  CreateMatchRoundParticipantBodySchema
) {}

export type UpdateMatchRoundParticipantBody = z.infer<
  typeof UpdateMatchRoundParticipantBodySchema
>

export class UpdateMatchRoundParticipantBodyDTO extends createZodDto(
  UpdateMatchRoundParticipantBodySchema
) {}

export type GetMatchRoundParticipantParams = z.infer<
  typeof GetMatchRoundParticipantParamsSchema
>

export class GetMatchRoundParticipantParamsDTO extends createZodDto(
  GetMatchRoundParticipantParamsSchema
) {}

export type GetMatchRoundByRoundParams = z.infer<
  typeof GetMatchRoundParticipantByRoundParamsSchema
>

export class GetMatchRoundByRoundParamsDTO extends createZodDto(
  GetMatchRoundParticipantByRoundParamsSchema
) {}

// Response DTOs
export type CreateMatchRoundParticipantRes = z.infer<
  typeof CreateMatchRoundParticipantResSchema
>

export class CreateMatchRoundParticipantResDTO extends createZodDto(
  CreateMatchRoundParticipantResSchema
) {}
export type UpdateMatchRoundParticipantRes = z.infer<
  typeof UpdateMatchRoundParticipantResSchema
>

export class UpdateMatchRoundParticipantResDTO extends createZodDto(
  UpdateMatchRoundParticipantResSchema
) {}
export type GetMatchRoundParticipantDetailRes = z.infer<
  typeof GetMatchRoundParticipantDetailResSchema
>

export class GetMatchRoundParticipantDetailResDTO extends createZodDto(
  GetMatchRoundParticipantDetailResSchema
) {}

export type ChoosePokemonMatchRoundParticipantBody = z.infer<
  typeof ChoosePokemonMatchRoundParticipantBodySchema
>

export class ChoosePokemonMatchRoundParticipantBodyDTO extends createZodDto(
  ChoosePokemonMatchRoundParticipantBodySchema
) {}
