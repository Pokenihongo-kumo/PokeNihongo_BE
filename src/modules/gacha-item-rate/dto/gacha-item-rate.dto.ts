import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateGachaItemRateBodySchema,
  CreateGachaItemRateResSchema,
  GetGachaItemRateDetailResSchema,
  GetGachaItemRateParamsSchema,
  UpdateGachaItemRateBodySchema,
  UpdateGachaItemRateResSchema
} from './gacha-item-rate.zod-dto'

// Request DTOs

export type CreateGachaItemRateBody = z.infer<typeof CreateGachaItemRateBodySchema>

export class CreateGachaItemRateBodyDTO extends createZodDto(
  CreateGachaItemRateBodySchema
) {}

export type UpdateGachaItemRateBody = z.infer<typeof UpdateGachaItemRateBodySchema>

export class UpdateGachaItemRateBodyDTO extends createZodDto(
  UpdateGachaItemRateBodySchema
) {}

export type GetGachaItemRateParams = z.infer<typeof GetGachaItemRateParamsSchema>

export class GetGachaItemRateParamsDTO extends createZodDto(
  GetGachaItemRateParamsSchema
) {}

// Response DTOs

export type CreateGachaItemRateRes = z.infer<typeof CreateGachaItemRateResSchema>

export class CreateGachaItemRateResDTO extends createZodDto(
  CreateGachaItemRateResSchema
) {}

export type UpdateGachaItemRateRes = z.infer<typeof UpdateGachaItemRateResSchema>

export class UpdateGachaItemRateResDTO extends createZodDto(
  UpdateGachaItemRateResSchema
) {}

export type GetGachaItemRateDetailRes = z.infer<typeof GetGachaItemRateDetailResSchema>

export class GetGachaItemRateDetailResDTO extends createZodDto(
  GetGachaItemRateDetailResSchema
) {}
