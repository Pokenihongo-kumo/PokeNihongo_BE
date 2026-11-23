import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateMatchParticipantBodySchema,
  CreateMatchParticipantResSchema,
  GetMatchParticipantDetailResSchema,
  GetMatchParticipantParamsSchema,
  UpdateMatchParticipantBodySchema
} from './match-participant.zod-dto'

// Request DTOs

export type CreateMatchParticipantBody = z.infer<typeof CreateMatchParticipantBodySchema>

export class CreateMatchParticipantBodyDTO extends createZodDto(
  CreateMatchParticipantBodySchema
) {}

export type UpdateMatchParticipantBody = z.infer<typeof UpdateMatchParticipantBodySchema>

export class UpdateMatchParticipantBodyDTO extends createZodDto(
  UpdateMatchParticipantBodySchema
) {}

export type GetMatchParticipantParams = z.infer<typeof GetMatchParticipantParamsSchema>

export class GetMatchParticipantParamsDTO extends createZodDto(
  GetMatchParticipantParamsSchema
) {}

// Response DTOs

export type CreateMatchParticipantRes = z.infer<typeof CreateMatchParticipantResSchema>

export class CreateMatchParticipantResDTO extends createZodDto(
  CreateMatchParticipantResSchema
) {}
export type GetMatchParticipantDetailRes = z.infer<
  typeof GetMatchParticipantDetailResSchema
>

export class GetMatchParticipantDetailResDTO extends createZodDto(
  GetMatchParticipantDetailResSchema
) {}
