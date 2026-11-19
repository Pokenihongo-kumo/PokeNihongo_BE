import { GachaStarType } from '@/common/constants/gacha.constant'
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

export const GetGachaItemRateDetailSchema = GachaItemRateSchema

// Type exports
export type GachaItemRate = z.infer<typeof GachaItemRateSchema>
// Field for query
export type GachaItemFieldType = keyof z.infer<typeof GachaItemRateSchema>
export const GACHA_ITEM_RATE_FIELDS = Object.keys(
  GachaItemRateSchema.shape
) as GachaItemFieldType[]
