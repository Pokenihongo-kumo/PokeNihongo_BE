import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { ShopItemSchema } from '@/modules/shop-item/entities/shop-item.entity'
import { WalletTransactionSchema } from '@/modules/wallet-transaction/entities/wallet-transaction.entity'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base ShopPurchase Schema
export const ShopPurchaseSchema = z.object({
  id: z.number(),
  userId: z.number(),
  shopItemId: z.number(),
  walletTransId: z.number().nullable(),
  quantity: z.number().min(1),
  totalPrice: z.number(),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateShopPurchaseBodySchema = ShopPurchaseSchema.pick({
  shopItemId: true,
  quantity: true
}).strict()

export const CreateShopPurchaseResSchema = resSchema(ShopPurchaseSchema)

// Update Schema
export const UpdateShopPurchaseBodySchema = CreateShopPurchaseBodySchema.extend({})
  .partial()
  .strict()

export const UpdateShopPurchaseResSchema = CreateShopPurchaseResSchema

// Query Schema
export const GetShopPurchaseParamsSchema = z.object({
  shopPurchaseId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetShopPurchaseDetailSchema = ShopPurchaseSchema.extend({
  shopItem: ShopItemSchema.nullable().optional(),
  walletTrans: WalletTransactionSchema.nullable().optional()
})

export const GetShopPurchaseListResSchema = resSchema(
  z.array(GetShopPurchaseDetailSchema)
)

export const GetShopPurchaseDetailResSchema = resSchema(GetShopPurchaseDetailSchema)

// Type exports
export type ShopPurchaseType = z.infer<typeof ShopPurchaseSchema>
export type CreateShopPurchaseBodyType = z.infer<typeof CreateShopPurchaseBodySchema>
export type UpdateShopPurchaseBodyType = z.infer<typeof UpdateShopPurchaseBodySchema>
export type GetShopPurchaseParamsType = z.infer<typeof GetShopPurchaseParamsSchema>
export type GetShopPurchaseDetailType = z.infer<typeof GetShopPurchaseDetailSchema>

// Field for query
export type ShopPurchaseFieldType = keyof z.infer<typeof ShopPurchaseSchema>
export const SHOP_PURCHASE_FIELDS = Object.keys(
  ShopPurchaseSchema.shape
) as ShopPurchaseFieldType[]
