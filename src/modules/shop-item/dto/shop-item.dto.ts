import { createZodDto } from 'nestjs-zod'
import {
  CreateShopItemBodySchema,
  CreateShopItemResSchema,
  CreateWithListItemBodySchema,
  CreateWithListItemResSchema,
  GetRamdomAmountShopItemBodySchema,
  GetRandomShopItemResSchema,
  GetShopItemDetailResSchema,
  GetShopItemParamsSchema,
  UpdateShopItemBodySchema,
  UpdateShopItemResSchema,
  UpdateWithListItemBodySchema,
  UpdateWithListItemResSchema
} from './shop-item.zod-dto'

// Request DTOs
export class CreateShopItemBodyDTO extends createZodDto(CreateShopItemBodySchema) {}
export class CreateWithListItemBodyDTO extends createZodDto(
  CreateWithListItemBodySchema
) {}
export class UpdateShopItemBodyDTO extends createZodDto(UpdateShopItemBodySchema) {}
export class UpdateWithListItemBodyDTO extends createZodDto(
  UpdateWithListItemBodySchema
) {}
export class GetShopItemParamsDTO extends createZodDto(GetShopItemParamsSchema) {}
export class GetRamdomAmountShopItemBodyDTO extends createZodDto(
  GetRamdomAmountShopItemBodySchema
) {}

// Response DTOs
export class CreateShopItemResDTO extends createZodDto(CreateShopItemResSchema) {}
export class CreateWithListItemResDTO extends createZodDto(CreateWithListItemResSchema) {}
export class UpdateShopItemResDTO extends createZodDto(UpdateShopItemResSchema) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetShopItemDetailResDTO extends createZodDto(GetShopItemDetailResSchema) {}
export class GetRandomShopItemResDTO extends createZodDto(GetRandomShopItemResSchema) {}
