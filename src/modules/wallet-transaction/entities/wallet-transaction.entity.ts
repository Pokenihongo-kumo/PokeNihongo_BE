import {
  walletPurposeType,
  WalletTransactionSourceType,
  WalletTransactionType
} from '@/common/constants/wallet-transaction.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { WalletTransactionMessage } from '@/i18n/message-keys'
import { WalletSchema } from '@/modules/wallet/entities/wallet.entity'
import { resSchema } from '@/shared/utils/res-schema'
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

export const CreateWalletTransactionBodySchema = WalletTransactionSchema.pick({
  walletId: true,
  userId: true,
  purpose: true,
  referenceId: true,
  amount: true,
  type: true,
  source: true,
  description: true
}).strict()

export const CreateWalletTransactionResSchema = resSchema(WalletTransactionSchema)

export const UpdateWalletTransactionBodySchema = CreateWalletTransactionBodySchema

export const UpdateWalletTransactionResSchema = CreateWalletTransactionResSchema

export const GetWalletTransactionParamsSchema = z
  .object({
    walletTransactionId: checkIdSchema(WalletTransactionMessage.INVALID_DATA)
  })
  .strict()

export const GetWalletTransactionDetailResSchema = CreateWalletTransactionResSchema

export const GetWalletsWithUserResSchema = resSchema(z.array(WalletSchema))
export type WalletTransaction = z.infer<typeof WalletTransactionSchema>
export type CreateWalletTransactionBody = z.infer<
  typeof CreateWalletTransactionBodySchema
>
export type UpdateWalletTransactionBody = z.infer<
  typeof UpdateWalletTransactionBodySchema
>
export type GetWalletTransactionParams = z.infer<typeof GetWalletTransactionParamsSchema>
export type GetWalletTransactionDetailRes = z.infer<
  typeof GetWalletTransactionDetailResSchema
>

type WalletTransactionFieldType = keyof z.infer<typeof WalletTransactionSchema>
export const WALLET_TRANSACTION_FIELDS = Object.keys(
  WalletTransactionSchema.shape
) as WalletTransactionFieldType[]
