import { createZodDto } from 'nestjs-zod'
import {
  CreateWithListItemBodySchema,
  CreateWithListItemResSchema,
  GetGachaItemDetailResSchema,
  GetGachaItemParamsSchema,
  GetRamdomAmountGachaItemsBodySchema,
  GetRandomGachaItemsResSchema,
  UpdateWithListItemBodySchema,
  UpdateWithListItemResSchema
} from './gacha-item.zod-dto'
export class CreateWithListItemBodyDTO extends createZodDto(
  CreateWithListItemBodySchema
) {}
export class UpdateWithListItemBodyDTO extends createZodDto(
  UpdateWithListItemBodySchema
) {}
export class GetGachaItemParamsDTO extends createZodDto(GetGachaItemParamsSchema) {}
export class GetRamdomAmountGachaItemsBodyDTO extends createZodDto(
  GetRamdomAmountGachaItemsBodySchema
) {}
export class CreateWithListItemResDTO extends createZodDto(CreateWithListItemResSchema) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetGachaItemDetailResDTO extends createZodDto(GetGachaItemDetailResSchema) {}
export class GetRandomGachaItemsResDTO extends createZodDto(
  GetRandomGachaItemsResSchema
) {}
