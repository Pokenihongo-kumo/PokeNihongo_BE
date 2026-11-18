import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE, GachaPurchaseMessage } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GachaPurchaseSchema,
  GetGachaPurchaseDetailSchema
} from '../entities/gacha-purchase.entity'

// Create Schema
// The app rolls 1 or 10 at a time; 1.5 or 1000000 used to be taken
const rollCountInvalid = { message: GachaPurchaseMessage.INVALID_DATA }

export const CreateGachaPurchaseBodySchema = GachaPurchaseSchema.pick({
  bannerId: true
})
  .extend({
    rollCount: z
      .number(rollCountInvalid)
      .int(rollCountInvalid)
      .min(1, rollCountInvalid)
      .max(10, rollCountInvalid)
  })
  .strict()

export type CreateGachaPurchaseBody = z.infer<typeof CreateGachaPurchaseBodySchema>

export const CreateGachaPurchaseResSchema = resSchema(GachaPurchaseSchema)

// Update Schema

export const UpdateGachaPurchaseBodySchema = CreateGachaPurchaseBodySchema.extend({})
  .partial()
  .strict()

export type UpdateGachaPurchaseBody = z.infer<typeof UpdateGachaPurchaseBodySchema>

export const UpdateGachaPurchaseResSchema = CreateGachaPurchaseResSchema

// Query Schema

export const GetGachaPurchaseParamsSchema = z.object({
  gachaPurchaseId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export type GetGachaPurchaseParams = z.infer<typeof GetGachaPurchaseParamsSchema>

export const GetGachaPurchaseListResSchema = resSchema(
  z.array(GetGachaPurchaseDetailSchema)
)

export const GetGachaPurchaseDetailResSchema = resSchema(GetGachaPurchaseDetailSchema)
