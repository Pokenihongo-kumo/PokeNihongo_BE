import { walletType } from '@/common/constants/wallet.constant'
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

export type Wallet = z.infer<typeof WalletSchema>
type WalletFieldType = keyof z.infer<typeof WalletSchema>
export const WALLET_FIELDS = Object.keys(WalletSchema.shape) as WalletFieldType[]
