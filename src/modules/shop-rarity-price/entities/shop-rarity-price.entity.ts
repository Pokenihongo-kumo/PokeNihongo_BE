import { RarityPokemon } from '@/common/constants/pokemon.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base ShopRarityPrice Schema
export const ShopRarityPriceSchema = z.object({
  id: z.number(),
  rarity: z.enum([
    RarityPokemon.COMMON,
    RarityPokemon.UNCOMMON,
    RarityPokemon.RARE,
    RarityPokemon.EPIC,
    RarityPokemon.LEGENDARY
  ]),
  price: z.number().min(0).max(1000000),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateShopRarityPriceBodySchema = ShopRarityPriceSchema.pick({
  rarity: true,
  price: true
}).strict()

export const CreateShopRarityPriceResSchema = resSchema(ShopRarityPriceSchema)

// Update Schema
export const UpdateShopRarityPriceBodySchema = CreateShopRarityPriceBodySchema.extend({
  isChangeAllShopPreview: z.boolean().default(false)
})
  .partial()
  .strict()

export const UpdateShopRarityPriceResSchema = CreateShopRarityPriceResSchema

export const UpdateWithListItemResSchema = resSchema(z.array(ShopRarityPriceSchema))

// Query Schema
export const GetShopRarityPriceParamsSchema = z.object({
  shopRarityPriceId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetShopRarityPriceDetailSchema = ShopRarityPriceSchema

export const GetShopRarityPriceDetailResSchema = resSchema(GetShopRarityPriceDetailSchema)

// Type exports
export type ShopRarityPriceType = z.infer<typeof ShopRarityPriceSchema>
export type CreateShopRarityPriceBodyType = z.infer<
  typeof CreateShopRarityPriceBodySchema
>
export type UpdateShopRarityPriceBodyType = z.infer<
  typeof UpdateShopRarityPriceBodySchema
>
export type GetShopRarityPriceParamsType = z.infer<typeof GetShopRarityPriceParamsSchema>

// Field for query
export type ShopRarityPriceFieldType = keyof z.infer<typeof ShopRarityPriceSchema>
export const SHOP_RARITY_PRICE_FIELDS = Object.keys(
  ShopRarityPriceSchema.shape
) as ShopRarityPriceFieldType[]
