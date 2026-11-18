import { GachaPityType, GachaStarType } from '@/common/constants/gacha.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { resSchema } from '@/shared/utils/res-schema'
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

// Create Schema
export const CreateGachaRollHistoryBodySchema = GachaRollHistorySchema.pick({
  purchaseId: true,
  userId: true,
  bannerId: true,
  pokemonId: true,
  rarity: true,
  pityId: true,
  pityNow: true,
  pityStatus: true
})
  .extend({
    userId: z.number().optional()
  })
  .strict()

export const CreateGachaRollHistoryResSchema = resSchema(GachaRollHistorySchema)

// Update Schema
export const UpdateGachaRollHistoryBodySchema =
  CreateGachaRollHistoryBodySchema.partial().strict()

export const UpdateGachaRollHistoryResSchema = CreateGachaRollHistoryResSchema

export const UpdateWithListItemResSchema = resSchema(z.array(GachaRollHistorySchema))

// Query Schema
export const GetGachaRollHistoryParamsSchema = z.object({
  gachaRollHistoryId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetGachaRollHistoryDetailSchema = GachaRollHistorySchema

export const GetGachaRollHistoryDetailResSchema = resSchema(
  GetGachaRollHistoryDetailSchema
)

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
export type GachaRollHistoryType = z.infer<typeof GachaRollHistorySchema>
export type CreateGachaRollHistoryBodyType = z.infer<
  typeof CreateGachaRollHistoryBodySchema
>
export type UpdateGachaRollHistoryBodyType = z.infer<
  typeof UpdateGachaRollHistoryBodySchema
>
export type GetGachaRollHistoryParamsType = z.infer<
  typeof GetGachaRollHistoryParamsSchema
>

// Field for query
export type GachaRollHistoryFieldType = keyof z.infer<typeof GachaRollHistorySchema>
export const GACHA_ROLL_HISTORY_FIELDS = Object.keys(
  GachaRollHistorySchema.shape
) as GachaRollHistoryFieldType[]
