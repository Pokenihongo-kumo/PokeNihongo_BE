import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateShopRarityPriceBodySchema,
  CreateShopRarityPriceResSchema,
  GetShopRarityPriceDetailResSchema,
  GetShopRarityPriceParamsSchema,
  UpdateShopRarityPriceBodySchema,
  UpdateShopRarityPriceResSchema
} from './shop-rarity-price.zod-dto'

// Request DTOs

export type CreateShopRarityPriceBody = z.infer<typeof CreateShopRarityPriceBodySchema>

export class CreateShopRarityPriceBodyDTO extends createZodDto(
  CreateShopRarityPriceBodySchema
) {}

export type UpdateShopRarityPriceBody = z.infer<typeof UpdateShopRarityPriceBodySchema>

export class UpdateShopRarityPriceBodyDTO extends createZodDto(
  UpdateShopRarityPriceBodySchema
) {}

export type GetShopRarityPriceParams = z.infer<typeof GetShopRarityPriceParamsSchema>

export class GetShopRarityPriceParamsDTO extends createZodDto(
  GetShopRarityPriceParamsSchema
) {}

// Response DTOs

export type CreateShopRarityPriceRes = z.infer<typeof CreateShopRarityPriceResSchema>

export class CreateShopRarityPriceResDTO extends createZodDto(
  CreateShopRarityPriceResSchema
) {}

export type UpdateShopRarityPriceRes = z.infer<typeof UpdateShopRarityPriceResSchema>

export class UpdateShopRarityPriceResDTO extends createZodDto(
  UpdateShopRarityPriceResSchema
) {}
export type GetShopRarityPriceDetailRes = z.infer<
  typeof GetShopRarityPriceDetailResSchema
>

export class GetShopRarityPriceDetailResDTO extends createZodDto(
  GetShopRarityPriceDetailResSchema
) {}
