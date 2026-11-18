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

export const GetGachaPurchaseDetailSchema = GachaPurchaseSchema.extend({})

// Type exports
export type GachaPurchase = z.infer<typeof GachaPurchaseSchema>
export type GetGachaPurchaseDetail = z.infer<typeof GetGachaPurchaseDetailSchema>

// Field for query
export type GachaPurchaseFieldType = keyof z.infer<typeof GachaPurchaseSchema>
export const SHOP_PURCHASE_FIELDS = Object.keys(
  GachaPurchaseSchema.shape
) as GachaPurchaseFieldType[]
