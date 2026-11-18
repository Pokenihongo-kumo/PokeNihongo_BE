import {
  walletPurposeType,
  WalletTransactionSourceType,
  WalletTransactionType
} from '@/common/constants/wallet-transaction.constant'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const WalletTransactionSchema = z.object({
  id: z.number(),
  walletId: z.number(),
  userId: z.number(),
  purpose: z.enum([
    walletPurposeType.GACHA,
    walletPurposeType.SUBSCRIPTION,
    walletPurposeType.SHOP,
    walletPurposeType.DAILY_REQUEST,
    walletPurposeType.REWARD,
    walletPurposeType.REFUND
  ]),
  referenceId: z.number().nullable(),
  amount: z.number(),
  type: z.enum([WalletTransactionType.INCREASE, WalletTransactionType.DECREASE]),
  source: z.enum([
    WalletTransactionSourceType.DAILY_CHECKIN,
    WalletTransactionSourceType.EVENT_REWARD,
    WalletTransactionSourceType.RANK_REWARD,
    WalletTransactionSourceType.LESSON_PURCHASE,
    WalletTransactionSourceType.SHOP_PURCHASE,
    WalletTransactionSourceType.SUBSCRIPTION_DISCOUNT,
    WalletTransactionSourceType.ADMIN_ADJUST
  ]),
  description: z.string().nullable(),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type WalletTransaction = z.infer<typeof WalletTransactionSchema>
type WalletTransactionFieldType = keyof z.infer<typeof WalletTransactionSchema>
export const WALLET_TRANSACTION_FIELDS = Object.keys(
  WalletTransactionSchema.shape
) as WalletTransactionFieldType[]
