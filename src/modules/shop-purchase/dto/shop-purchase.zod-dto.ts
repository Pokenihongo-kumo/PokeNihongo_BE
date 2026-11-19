import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GetShopPurchaseDetailSchema,
  ShopPurchaseSchema
} from '../entities/shop-purchase.entity'

// Create Schema

export const CreateShopPurchaseBodySchema = ShopPurchaseSchema.pick({
  shopItemId: true,
  quantity: true
}).strict()

export type CreateShopPurchaseBody = z.infer<typeof CreateShopPurchaseBodySchema>

export const CreateShopPurchaseResSchema = resSchema(ShopPurchaseSchema)

// Update Schema

export const UpdateShopPurchaseBodySchema = CreateShopPurchaseBodySchema.extend({})
  .partial()
  .strict()

export type UpdateShopPurchaseBody = z.infer<typeof UpdateShopPurchaseBodySchema>

export const UpdateShopPurchaseResSchema = CreateShopPurchaseResSchema

// Query Schema

export const GetShopPurchaseParamsSchema = z.object({
  shopPurchaseId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export type GetShopPurchaseParams = z.infer<typeof GetShopPurchaseParamsSchema>

export const GetShopPurchaseListResSchema = resSchema(
  z.array(GetShopPurchaseDetailSchema)
)

export const GetShopPurchaseDetailResSchema = resSchema(GetShopPurchaseDetailSchema)
