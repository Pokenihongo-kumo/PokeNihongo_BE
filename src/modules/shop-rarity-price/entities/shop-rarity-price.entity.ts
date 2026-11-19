import { RarityPokemon } from '@/common/constants/pokemon.constant'
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

export const GetShopRarityPriceDetailSchema = ShopRarityPriceSchema

// Type exports
export type ShopRarityPrice = z.infer<typeof ShopRarityPriceSchema>
// Field for query
export type ShopRarityPriceFieldType = keyof z.infer<typeof ShopRarityPriceSchema>
export const SHOP_RARITY_PRICE_FIELDS = Object.keys(
  ShopRarityPriceSchema.shape
) as ShopRarityPriceFieldType[]
