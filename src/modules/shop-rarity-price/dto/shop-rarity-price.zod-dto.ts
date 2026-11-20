import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GetShopRarityPriceDetailSchema,
  ShopRarityPriceSchema
} from '../entities/shop-rarity-price.entity'

// Create Schema

export const CreateShopRarityPriceBodySchema = ShopRarityPriceSchema.pick({
  rarity: true,
  price: true
}).strict()

export type CreateShopRarityPriceBody = z.infer<typeof CreateShopRarityPriceBodySchema>

export const CreateShopRarityPriceResSchema = resSchema(ShopRarityPriceSchema)

// Update Schema

export const UpdateShopRarityPriceBodySchema = CreateShopRarityPriceBodySchema.extend({
  isChangeAllShopPreview: z.boolean().default(false)
})
  .partial()
  .strict()

export type UpdateShopRarityPriceBody = z.infer<typeof UpdateShopRarityPriceBodySchema>

export const UpdateShopRarityPriceResSchema = CreateShopRarityPriceResSchema

// Query Schema

export const GetShopRarityPriceParamsSchema = z.object({
  shopRarityPriceId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetShopRarityPriceDetailResSchema = resSchema(GetShopRarityPriceDetailSchema)
