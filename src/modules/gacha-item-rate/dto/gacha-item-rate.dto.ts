import { createZodDto } from 'nestjs-zod'
import {
  CreateGachaItemRateBodySchema,
  CreateGachaItemRateResSchema,
  GetGachaItemRateDetailResSchema,
  GetGachaItemRateParamsSchema,
  UpdateGachaItemRateBodySchema,
  UpdateGachaItemRateResSchema,
  UpdateWithListItemResSchema
} from './gacha-item-rate.zod-dto'

// Request DTOs
export class CreateGachaItemRateBodyDTO extends createZodDto(
  CreateGachaItemRateBodySchema
) {}

export class UpdateGachaItemRateBodyDTO extends createZodDto(
  UpdateGachaItemRateBodySchema
) {}

export class GetGachaItemRateParamsDTO extends createZodDto(
  GetGachaItemRateParamsSchema
) {}

// Response DTOs
export class CreateGachaItemRateResDTO extends createZodDto(
  CreateGachaItemRateResSchema
) {}
export class UpdateGachaItemRateResDTO extends createZodDto(
  UpdateGachaItemRateResSchema
) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetGachaItemRateDetailResDTO extends createZodDto(
  GetGachaItemRateDetailResSchema
) {}
