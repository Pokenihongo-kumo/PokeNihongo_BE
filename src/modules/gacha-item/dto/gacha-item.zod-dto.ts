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

export const CreateWithListItemResSchema = resSchema(z.array(GachaItemSchema))

export const UpdateWithListItemResSchema = resSchema(z.array(GachaItemSchema))

// ============ QUERY SCHEMAS ============

export const GetGachaItemParamsSchema = z.object({
  gachaItemId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetGachaItemDetailResSchema = resSchema(GetGachaItemDetailSchema)
