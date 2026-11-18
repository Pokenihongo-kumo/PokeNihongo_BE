import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { resSchema } from '@/shared/utils/res-schema'
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

export type GachaItemType = z.infer<typeof GachaItemSchema>

// ============ NEW STRUCTURE ============

// Create single item: { starType, pokemonId }
export const CreateGachaItemBodySchema = z
  .object({
    starType: z.nativeEnum(GachaStarType),
    pokemonId: z.number()
  })
  .strict()

export type CreateGachaItemBodyType = z.infer<typeof CreateGachaItemBodySchema>

// Create multiple items: { bannerId, items: [{ starType, pokemons: [...] }] }
export const CreateGachaItemByStarTypeSchema = z.object({
  starType: z.nativeEnum(GachaStarType),
  pokemons: z.array(z.number())
})

export const CreateWithListItemBodySchema = z.object({
  bannerId: z.number(),
  items: z.array(CreateGachaItemByStarTypeSchema)
})

export type CreateWithListItemBodyType = z.infer<typeof CreateWithListItemBodySchema>

// Update single item: { starType, pokemonId }
export const UpdateGachaItemBodySchema = z
  .object({
    starType: z.nativeEnum(GachaStarType).optional(),
    pokemonId: z.number().optional()
  })
  .strict()

export type UpdateGachaItemBodyType = z.infer<typeof UpdateGachaItemBodySchema>

// Update multiple items: { bannerId, items: [{ starType, pokemons: [...] }] }
export const UpdateWithListItemBodySchema = z.object({
  bannerId: z.number(),
  items: z.array(CreateGachaItemByStarTypeSchema).min(1)
})

export type UpdateWithListGachaItemBodyType = z.infer<typeof UpdateWithListItemBodySchema>

// ============ RANDOM API ============

export const GetRandomGachaItemTypeSchema = z.object({
  starType: z.nativeEnum(GachaStarType),
  typeIds: z.array(z.number()).default([])
})

export const GetRamdomAmountGachaItemsBodySchema = z.object({
  bannerId: z.number(),
  items: z.array(GetRandomGachaItemTypeSchema)
})

export type GetRamdomAmountGachaItemsBodyType = z.infer<
  typeof GetRamdomAmountGachaItemsBodySchema
>

export const GetRandomGachaItemsResSchema = resSchema(
  z.object({
    bannerId: z.number(),
    items: z.array(
      z.object({
        starType: z.nativeEnum(GachaStarType),
        pokemons: z.array(PokemonSchema)
      })
    )
  })
)

// ============ RESPONSE SCHEMAS ============

export const CreateGachaItemResSchema = resSchema(GachaItemSchema)

export const CreateWithListItemResSchema = resSchema(z.array(GachaItemSchema))

export const UpdateGachaItemResSchema = CreateGachaItemResSchema

export const UpdateWithListItemResSchema = resSchema(z.array(GachaItemSchema))

// ============ QUERY SCHEMAS ============

export const GetGachaItemParamsSchema = z.object({
  gachaItemId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
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

export const GetGachaItemDetailResSchema = resSchema(GetGachaItemDetailSchema)

// ============ TYPE EXPORTS ============

export type GetGachaItemParamsType = z.infer<typeof GetGachaItemParamsSchema>
export type GetGachaItemDetailType = z.infer<typeof GetGachaItemDetailSchema>
export type GetRandomGachaItemTypeType = z.infer<typeof GetRandomGachaItemTypeSchema>

export type GachaItemFieldType = keyof z.infer<typeof GachaItemSchema>
export const GACHA_ITEM_FIELDS = Object.keys(
  GachaItemSchema.shape
) as GachaItemFieldType[]
