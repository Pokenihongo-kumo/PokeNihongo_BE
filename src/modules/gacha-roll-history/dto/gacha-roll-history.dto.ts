import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'

import {
  CreateGachaRollHistoryBodySchema,
  CreateGachaRollHistoryResSchema,
  GetGachaRollHistoryDetailResSchema,
  GetGachaRollHistoryParamsSchema,
  UpdateGachaRollHistoryBodySchema,
  UpdateGachaRollHistoryResSchema
} from './gacha-roll-history.zod-dto'

// Request DTOs

export type CreateGachaRollHistoryBody = z.infer<typeof CreateGachaRollHistoryBodySchema>

export class CreateGachaRollHistoryBodyDTO extends createZodDto(
  CreateGachaRollHistoryBodySchema
) {}

export type UpdateGachaRollHistoryBody = z.infer<typeof UpdateGachaRollHistoryBodySchema>

export class UpdateGachaRollHistoryBodyDTO extends createZodDto(
  UpdateGachaRollHistoryBodySchema
) {}

export type GetGachaRollHistoryParams = z.infer<typeof GetGachaRollHistoryParamsSchema>

export class GetGachaRollHistoryParamsDTO extends createZodDto(
  GetGachaRollHistoryParamsSchema
) {}

// Response DTOs

export type CreateGachaRollHistoryRes = z.infer<typeof CreateGachaRollHistoryResSchema>

export class CreateGachaRollHistoryResDTO extends createZodDto(
  CreateGachaRollHistoryResSchema
) {}

export type UpdateGachaRollHistoryRes = z.infer<typeof UpdateGachaRollHistoryResSchema>

export class UpdateGachaRollHistoryResDTO extends createZodDto(
  UpdateGachaRollHistoryResSchema
) {}
export type GetGachaRollHistoryDetailRes = z.infer<
  typeof GetGachaRollHistoryDetailResSchema
>

export class GetGachaRollHistoryDetailResDTO extends createZodDto(
  GetGachaRollHistoryDetailResSchema
) {}
