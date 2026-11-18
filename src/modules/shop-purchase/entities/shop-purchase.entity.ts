import { ShopItemSchema } from '@/modules/shop-item/entities/shop-item.entity'
import { WalletTransactionSchema } from '@/modules/wallet-transaction/entities/wallet-transaction.entity'
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

export const GetShopPurchaseDetailSchema = ShopPurchaseSchema.extend({
  shopItem: ShopItemSchema.nullable().optional(),
  walletTrans: WalletTransactionSchema.nullable().optional()
})

// Type exports
export type ShopPurchase = z.infer<typeof ShopPurchaseSchema>
export type GetShopPurchaseDetail = z.infer<typeof GetShopPurchaseDetailSchema>

// Field for query
export type ShopPurchaseFieldType = keyof z.infer<typeof ShopPurchaseSchema>
export const SHOP_PURCHASE_FIELDS = Object.keys(
  ShopPurchaseSchema.shape
) as ShopPurchaseFieldType[]
