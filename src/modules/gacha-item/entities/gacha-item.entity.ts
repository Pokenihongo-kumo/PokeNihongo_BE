import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { GachaStarType } from '@prisma/client'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base GachaItem Schema
export const GachaItemSchema = z.object({
  id: z.number(),
  bannerId: z.number(),
  pokemonId: z.number(),
  gachaItemRateId: z.number(),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type GachaItem = z.infer<typeof GachaItemSchema>

// ============ RANDOM API ============

export const GetRandomGachaItemTypeSchema = z.object({
  starType: z.nativeEnum(GachaStarType),
  typeIds: z.array(z.number()).default([])
})

export const GetGachaItemDetailSchema = GachaItemSchema.extend({
  pokemon: PokemonSchema.pick({
    id: true,
    nameJp: true,
    nameTranslations: true,
    imageUrl: true,
    rarity: true
  }),
  gachaItemRate: z.object({
    id: z.number(),
    starType: z.nativeEnum(GachaStarType),
    rate: z.number()
  })
})

export type GetGachaItemDetail = z.infer<typeof GetGachaItemDetailSchema>
export type GetRandomGachaItemType = z.infer<typeof GetRandomGachaItemTypeSchema>

export type GachaItemFieldType = keyof z.infer<typeof GachaItemSchema>
export const GACHA_ITEM_FIELDS = Object.keys(
  GachaItemSchema.shape
) as GachaItemFieldType[]
