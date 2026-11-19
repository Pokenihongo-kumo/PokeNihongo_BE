import { createZodDto } from 'nestjs-zod'
import {
  ChoosePokemonMatchRoundParticipantBodySchema,
  CreateMatchRoundParticipantBodySchema,
  CreateMatchRoundParticipantResSchema,
  GetMatchRoundParticipantByRoundParamsSchema,
  GetMatchRoundParticipantDetailResSchema,
  GetMatchRoundParticipantParamsSchema,
  UpdateMatchRoundParticipantBodySchema,
  UpdateMatchRoundParticipantResSchema,
  UpdateWithListItemResSchema
} from './match-round-participant.zod-dto'

// Request DTOs
export class CreateMatchRoundParticipantBodyDTO extends createZodDto(
  CreateMatchRoundParticipantBodySchema
) {}

export class UpdateMatchRoundParticipantBodyDTO extends createZodDto(
  UpdateMatchRoundParticipantBodySchema
) {}

export class GetMatchRoundParticipantParamsDTO extends createZodDto(
  GetMatchRoundParticipantParamsSchema
) {}

export class GetMatchRoundByRoundParamsDTO extends createZodDto(
  GetMatchRoundParticipantByRoundParamsSchema
) {}

// Response DTOs
export class CreateMatchRoundParticipantResDTO extends createZodDto(
  CreateMatchRoundParticipantResSchema
) {}
export class UpdateMatchRoundParticipantResDTO extends createZodDto(
  UpdateMatchRoundParticipantResSchema
) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetMatchRoundParticipantDetailResDTO extends createZodDto(
  GetMatchRoundParticipantDetailResSchema
) {}

export class ChoosePokemonMatchRoundParticipantBodyDTO extends createZodDto(
  ChoosePokemonMatchRoundParticipantBodySchema
) {}
