import { createZodDto } from 'nestjs-zod'
import {
  CreateGachaItemBodySchema,
  CreateGachaItemResSchema,
  CreateWithListItemBodySchema,
  CreateWithListItemResSchema,
  GetGachaItemDetailResSchema,
  GetGachaItemParamsSchema,
  GetRamdomAmountGachaItemsBodySchema,
  GetRandomGachaItemsResSchema,
  UpdateGachaItemBodySchema,
  UpdateGachaItemResSchema,
  UpdateWithListItemBodySchema,
  UpdateWithListItemResSchema
} from './gacha-item.zod-dto'

// Request DTOs
export class CreateGachaItemBodyDTO extends createZodDto(CreateGachaItemBodySchema) {}
export class CreateWithListItemBodyDTO extends createZodDto(
  CreateWithListItemBodySchema
) {}
export class UpdateGachaItemBodyDTO extends createZodDto(UpdateGachaItemBodySchema) {}
export class UpdateWithListItemBodyDTO extends createZodDto(
  UpdateWithListItemBodySchema
) {}
export class GetGachaItemParamsDTO extends createZodDto(GetGachaItemParamsSchema) {}
export class GetRamdomAmountGachaItemsBodyDTO extends createZodDto(
  GetRamdomAmountGachaItemsBodySchema
) {}

// Response DTOs
export class CreateGachaItemResDTO extends createZodDto(CreateGachaItemResSchema) {}
export class CreateWithListItemResDTO extends createZodDto(CreateWithListItemResSchema) {}
export class UpdateGachaItemResDTO extends createZodDto(UpdateGachaItemResSchema) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetGachaItemDetailResDTO extends createZodDto(GetGachaItemDetailResSchema) {}
export class GetRandomGachaItemsResDTO extends createZodDto(
  GetRandomGachaItemsResSchema
) {}
