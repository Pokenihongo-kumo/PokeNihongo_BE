import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GachaRollHistorySchema,
  GetGachaRollHistoryDetailSchema
} from '../entities/gacha-roll-history.entity'

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

export type CreateGachaRollHistoryBody = z.infer<typeof CreateGachaRollHistoryBodySchema>

export const CreateGachaRollHistoryResSchema = resSchema(GachaRollHistorySchema)

// Update Schema

export const UpdateGachaRollHistoryBodySchema =
  CreateGachaRollHistoryBodySchema.partial().strict()

export type UpdateGachaRollHistoryBody = z.infer<typeof UpdateGachaRollHistoryBodySchema>

export const UpdateGachaRollHistoryResSchema = CreateGachaRollHistoryResSchema

export const UpdateWithListItemResSchema = resSchema(z.array(GachaRollHistorySchema))

// Query Schema

export const GetGachaRollHistoryParamsSchema = z.object({
  gachaRollHistoryId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export type GetGachaRollHistoryParams = z.infer<typeof GetGachaRollHistoryParamsSchema>

export const GetGachaRollHistoryDetailResSchema = resSchema(
  GetGachaRollHistoryDetailSchema
)
