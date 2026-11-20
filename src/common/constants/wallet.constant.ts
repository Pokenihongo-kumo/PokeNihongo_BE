export const walletType = {
  POKE_COINS: 'POKE_COINS',
  SPARKLES: 'SPARKLES'
} as const

export type WalletTypeType = (typeof walletType)[keyof typeof walletType]

export const walletTransactionType = {
  INCREASE: 'INCREASE',
  DECREASE: 'DECREASE'
} as const

export type walletTransactionType =
  (typeof walletTransactionType)[keyof typeof walletTransactionType]
