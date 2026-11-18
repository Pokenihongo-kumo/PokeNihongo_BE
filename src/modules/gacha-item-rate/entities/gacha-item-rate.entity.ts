import { GachaStarType } from '@/common/constants/gacha.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base GachaItemRate Schema
export const GachaItemRateSchema = z.object({
  id: z.number(),
  starType: z.enum([
    GachaStarType.ONE,
    GachaStarType.TWO,
    GachaStarType.THREE,
    GachaStarType.FOUR,
    GachaStarType.FIVE
  ]),
  rate: z.number().min(0).max(100),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateGachaItemRateBodySchema = GachaItemRateSchema.pick({
  starType: true,
  rate: true
}).strict()

export const CreateGachaItemRateResSchema = resSchema(GachaItemRateSchema)

// Update Schema
export const UpdateGachaItemRateBodySchema =
  CreateGachaItemRateBodySchema.partial().strict()

export const UpdateGachaItemRateResSchema = CreateGachaItemRateResSchema

export const UpdateWithListItemResSchema = resSchema(z.array(GachaItemRateSchema))

// Query Schema
export const GetGachaItemRateParamsSchema = z.object({
  gachaItemRateId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetGachaItemRateDetailSchema = GachaItemRateSchema

export const GetGachaItemRateDetailResSchema = resSchema(GetGachaItemRateDetailSchema)

// Type exports
export type GachaItemRateType = z.infer<typeof GachaItemRateSchema>
export type CreateGachaItemRateBodyType = z.infer<typeof CreateGachaItemRateBodySchema>
export type UpdateGachaItemRateBodyType = z.infer<typeof UpdateGachaItemRateBodySchema>
export type GetGachaItemRateParamsType = z.infer<typeof GetGachaItemRateParamsSchema>

// Field for query
export type GachaItemFieldType = keyof z.infer<typeof GachaItemRateSchema>
export const GACHA_ITEM_RATE_FIELDS = Object.keys(
  GachaItemRateSchema.shape
) as GachaItemFieldType[]
