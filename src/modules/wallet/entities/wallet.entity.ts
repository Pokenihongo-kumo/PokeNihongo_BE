import { walletType } from '@/common/constants/wallet.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { WalletMessage } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const WalletSchema = z.object({
  id: z.number(),
  userId: z.number(),
  type: z.enum([walletType.POKE_COINS, walletType.SPARKLES]),
  balance: z.number().min(0).default(0),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateWalletBodySchema = WalletSchema.pick({
  userId: true,
  type: true,
  balance: true
}).strict()

export const CreateWalletResSchema = resSchema(WalletSchema)

export const UpdateWalletBodySchema = CreateWalletBodySchema

export const UpdateWalletResSchema = CreateWalletResSchema

export const GetWalletParamsSchema = z
  .object({
    walletId: checkIdSchema(WalletMessage.INVALID_DATA)
  })
  .strict()

export const GetWalletDetailResSchema = CreateWalletResSchema

export const GetWalletsWithUserResSchema = resSchema(z.array(WalletSchema))
export type Wallet = z.infer<typeof WalletSchema>
export type CreateWalletBody = z.infer<typeof CreateWalletBodySchema>
export type UpdateWalletBody = z.infer<typeof UpdateWalletBodySchema>
export type GetWalletParams = z.infer<typeof GetWalletParamsSchema>
export type GetWalletDetailRes = z.infer<typeof GetWalletDetailResSchema>

type WalletFieldType = keyof z.infer<typeof WalletSchema>
export const WALLET_FIELDS = Object.keys(WalletSchema.shape) as WalletFieldType[]
