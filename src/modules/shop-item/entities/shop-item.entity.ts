import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base ShopItem Schema
export const ShopItemSchema = z.object({
  id: z.number(),
  shopBannerId: z.number(),
  pokemonId: z.number(),
  price: z.number().min(0),
  purchaseLimit: z.number().min(0).nullable(),
  purchasedCount: z.number().default(0),
  isActive: z.boolean(),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const GetShopItemDetailSchema = ShopItemSchema.extend({
  // Use lazy to break circular dependency with ShopBannerSchema
  shopBanner: z
    .lazy(() => require('../../shop-banner/entities/shop-banner.entity').ShopBannerSchema)
    .optional(),
  pokemon: PokemonSchema.optional()
})

// Type exports
export type ShopItem = z.infer<typeof ShopItemSchema>
export type GetShopItemDetail = z.infer<typeof GetShopItemDetailSchema>
// Field for query
export type ShopItemFieldType = keyof z.infer<typeof ShopItemSchema>
export const SHOP_ITEM_FIELDS = Object.keys(ShopItemSchema.shape) as ShopItemFieldType[]
