import { createZodDto } from 'nestjs-zod'
import {
  CreateShopRarityPriceBodySchema,
  CreateShopRarityPriceResSchema,
  GetShopRarityPriceDetailResSchema,
  GetShopRarityPriceParamsSchema,
  UpdateShopRarityPriceBodySchema,
  UpdateShopRarityPriceResSchema,
  UpdateWithListItemResSchema
} from './shop-rarity-price.zod-dto'

// Request DTOs
export class CreateShopRarityPriceBodyDTO extends createZodDto(
  CreateShopRarityPriceBodySchema
) {}

export class UpdateShopRarityPriceBodyDTO extends createZodDto(
  UpdateShopRarityPriceBodySchema
) {}

export class GetShopRarityPriceParamsDTO extends createZodDto(
  GetShopRarityPriceParamsSchema
) {}

// Response DTOs
export class CreateShopRarityPriceResDTO extends createZodDto(
  CreateShopRarityPriceResSchema
) {}
export class UpdateShopRarityPriceResDTO extends createZodDto(
  UpdateShopRarityPriceResSchema
) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetShopRarityPriceDetailResDTO extends createZodDto(
  GetShopRarityPriceDetailResSchema
) {}
