import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE, GachaPurchaseMessage } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base GachaPurchase Schema
export const GachaPurchaseSchema = z.object({
  id: z.number(),
  userId: z.number(),
  bannerId: z.number(),
  walletTransId: z.number().nullable(),
  rollCount: z.number().min(1),
  totalCost: z.number().min(0),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

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

export const CreateGachaPurchaseResSchema = resSchema(GachaPurchaseSchema)

// Update Schema
export const UpdateGachaPurchaseBodySchema = CreateGachaPurchaseBodySchema.extend({})
  .partial()
  .strict()

export const UpdateGachaPurchaseResSchema = CreateGachaPurchaseResSchema

// Query Schema
export const GetGachaPurchaseParamsSchema = z.object({
  gachaPurchaseId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetGachaPurchaseDetailSchema = GachaPurchaseSchema.extend({})

export const GetGachaPurchaseListResSchema = resSchema(
  z.array(GetGachaPurchaseDetailSchema)
)

export const GetGachaPurchaseDetailResSchema = resSchema(GetGachaPurchaseDetailSchema)

// Type exports
export type GachaPurchaseType = z.infer<typeof GachaPurchaseSchema>
export type CreateGachaPurchaseBodyType = z.infer<typeof CreateGachaPurchaseBodySchema>
export type UpdateGachaPurchaseBodyType = z.infer<typeof UpdateGachaPurchaseBodySchema>
export type GetGachaPurchaseParamsType = z.infer<typeof GetGachaPurchaseParamsSchema>
export type GetGachaPurchaseDetailType = z.infer<typeof GetGachaPurchaseDetailSchema>

// Field for query
export type GachaPurchaseFieldType = keyof z.infer<typeof GachaPurchaseSchema>
export const SHOP_PURCHASE_FIELDS = Object.keys(
  GachaPurchaseSchema.shape
) as GachaPurchaseFieldType[]
