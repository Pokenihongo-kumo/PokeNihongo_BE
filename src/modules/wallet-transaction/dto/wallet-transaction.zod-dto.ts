import { checkIdSchema } from '@/common/utils/id.validation'
import { WalletTransactionMessage } from '@/i18n/message-keys'

import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { WalletTransactionSchema } from '../entities/wallet-transaction.entity'

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

export type CreateWalletTransactionBody = z.infer<
  typeof CreateWalletTransactionBodySchema
>

export const CreateWalletTransactionResSchema = resSchema(WalletTransactionSchema)

export const UpdateWalletTransactionBodySchema = CreateWalletTransactionBodySchema

export type UpdateWalletTransactionBody = z.infer<
  typeof UpdateWalletTransactionBodySchema
>

export class UpdateWalletTransactionBodyDTO extends createZodDto(
  UpdateWalletTransactionBodySchema
) {}

export const UpdateWalletTransactionResSchema = CreateWalletTransactionResSchema

export class UpdateWalletTransactionResDTO extends createZodDto(
  UpdateWalletTransactionResSchema
) {}

export const GetWalletTransactionParamsSchema = z
  .object({
    walletTransactionId: checkIdSchema(WalletTransactionMessage.INVALID_DATA)
  })
  .strict()

export class GetWalletTransactionParamsDTO extends createZodDto(
  GetWalletTransactionParamsSchema
) {}

export const GetWalletTransactionDetailResSchema = CreateWalletTransactionResSchema

export class GetWalletTransactionDetailResDTO extends createZodDto(
  GetWalletTransactionDetailResSchema
) {}
