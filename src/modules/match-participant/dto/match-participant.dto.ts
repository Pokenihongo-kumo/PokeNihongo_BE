import { createZodDto } from 'nestjs-zod'
import {
  CreateMatchParticipantBodySchema,
  CreateMatchParticipantResSchema,
  GetMatchParticipantDetailResSchema,
  GetMatchParticipantParamsSchema,
  UpdateMatchParticipantBodySchema,
  UpdateMatchParticipantResSchema,
  UpdateWithListItemResSchema
} from './match-participant.zod-dto'

// Request DTOs
export class CreateMatchParticipantBodyDTO extends createZodDto(
  CreateMatchParticipantBodySchema
) {}

export class UpdateMatchParticipantBodyDTO extends createZodDto(
  UpdateMatchParticipantBodySchema
) {}

export class GetMatchParticipantParamsDTO extends createZodDto(
  GetMatchParticipantParamsSchema
) {}

// Response DTOs
export class CreateMatchParticipantResDTO extends createZodDto(
  CreateMatchParticipantResSchema
) {}
export class UpdateMatchParticipantResDTO extends createZodDto(
  UpdateMatchParticipantResSchema
) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetMatchParticipantDetailResDTO extends createZodDto(
  GetMatchParticipantDetailResSchema
) {}
