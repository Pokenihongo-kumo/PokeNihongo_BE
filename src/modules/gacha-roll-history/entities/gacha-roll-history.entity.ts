import { GachaPityType, GachaStarType } from '@/common/constants/gacha.constant'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base GachaRollHistory Schema
export const GachaRollHistorySchema = z.object({
  id: z.number(),
  userId: z.number(),
  purchaseId: z.number(),
  bannerId: z.number(),
  pokemonId: z.number(),
  rarity: z.enum([
    GachaStarType.ONE,
    GachaStarType.TWO,
    GachaStarType.THREE,
    GachaStarType.FOUR,
    GachaStarType.FIVE
  ]),
  pityId: z.number().nullable(),
  pityNow: z.number(),
  pityStatus: z.enum([
    GachaPityType.COMPLETED_MAX,
    GachaPityType.COMPLETED_LUCK,
    GachaPityType.PENDING
  ]),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const GetGachaRollHistoryDetailSchema = GachaRollHistorySchema

export const GetGachasRolHisWithPokemonSchema = GachaRollHistorySchema.extend({
  pokemon: PokemonSchema.pick({
    id: true,
    pokedex_number: true,
    nameJp: true,
    nameTranslations: true,
    imageUrl: true,
    rarity: true
  })
})

// Type exports
export type GachaRollHistory = z.infer<typeof GachaRollHistorySchema>
// Field for query
export type GachaRollHistoryFieldType = keyof z.infer<typeof GachaRollHistorySchema>
export const GACHA_ROLL_HISTORY_FIELDS = Object.keys(
  GachaRollHistorySchema.shape
) as GachaRollHistoryFieldType[]
