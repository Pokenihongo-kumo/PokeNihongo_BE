import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { resSchema } from '@/shared/utils/res-schema'
import { GachaStarType } from '@prisma/client'
import { z } from 'zod'
import {
  GachaItemSchema,
  GetGachaItemDetailSchema,
  GetRandomGachaItemTypeSchema
} from '../entities/gacha-item.entity'

// ============ NEW STRUCTURE ============
// Create single item: { starType, pokemonId }

export const CreateGachaItemBodySchema = z
  .object({
    starType: z.nativeEnum(GachaStarType),
    pokemonId: z.number()
  })
  .strict()

export type CreateGachaItemBody = z.infer<typeof CreateGachaItemBodySchema>

// Create multiple items: { bannerId, items: [{ starType, pokemons: [...] }] }

export const CreateGachaItemByStarTypeSchema = z.object({
  starType: z.nativeEnum(GachaStarType),
  pokemons: z.array(z.number())
})

export const CreateWithListItemBodySchema = z.object({
  bannerId: z.number(),
  items: z.array(CreateGachaItemByStarTypeSchema)
})

export type CreateWithListItemBody = z.infer<typeof CreateWithListItemBodySchema>

// Update single item: { starType, pokemonId }

export const UpdateGachaItemBodySchema = z
  .object({
    starType: z.nativeEnum(GachaStarType).optional(),
    pokemonId: z.number().optional()
  })
  .strict()

export type UpdateGachaItemBody = z.infer<typeof UpdateGachaItemBodySchema>

// Update multiple items: { bannerId, items: [{ starType, pokemons: [...] }] }

export const UpdateWithListItemBodySchema = z.object({
  bannerId: z.number(),
  items: z.array(CreateGachaItemByStarTypeSchema).min(1)
})

export type UpdateWithListGachaItemBody = z.infer<typeof UpdateWithListItemBodySchema>

export const GetRamdomAmountGachaItemsBodySchema = z.object({
  bannerId: z.number(),
  items: z.array(GetRandomGachaItemTypeSchema)
})

export type GetRamdomAmountGachaItemsBody = z.infer<
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

// ============ TYPE EXPORTS ============

export type GetGachaItemParams = z.infer<typeof GetGachaItemParamsSchema>

export const GetGachaItemDetailResSchema = resSchema(GetGachaItemDetailSchema)
