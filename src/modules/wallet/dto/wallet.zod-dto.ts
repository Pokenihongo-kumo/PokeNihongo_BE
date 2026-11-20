import { checkIdSchema } from '@/common/utils/id.validation'
import { WalletMessage } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import { WalletSchema } from '../entities/wallet.entity'

export const CreateWalletBodySchema = WalletSchema.pick({
  userId: true,
  type: true,
  balance: true
}).strict()

export type CreateWalletBody = z.infer<typeof CreateWalletBodySchema>

export const CreateWalletResSchema = resSchema(WalletSchema)

export const UpdateWalletBodySchema = CreateWalletBodySchema

export type UpdateWalletBody = z.infer<typeof UpdateWalletBodySchema>

export const UpdateWalletResSchema = CreateWalletResSchema

export const GetWalletParamsSchema = z
  .object({
    walletId: checkIdSchema(WalletMessage.INVALID_DATA)
  })
  .strict()

export const GetWalletDetailResSchema = CreateWalletResSchema

export const GetWalletsWithUserResSchema = resSchema(z.array(WalletSchema))
