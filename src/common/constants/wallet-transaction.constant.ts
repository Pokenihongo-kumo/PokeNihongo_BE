export const walletPurposeType = {
  SUBSCRIPTION: 'SUBSCRIPTION',
  GACHA: 'GACHA',
  SHOP: 'SHOP',
  DAILY_REQUEST: 'DAILY_REQUEST',
  REWARD: 'REWARD',
  REFUND: 'REFUND'
} as const

export const WalletTransactionType = {
  INCREASE: 'INCREASE',
  DECREASE: 'DECREASE'
} as const

export type WalletTransactionTypeType =
  (typeof WalletTransactionType)[keyof typeof WalletTransactionType]

export const WalletTransactionSourceType = {
  DAILY_CHECKIN: 'DAILY_CHECKIN',
  EVENT_REWARD: 'EVENT_REWARD',
  RANK_REWARD: 'RANK_REWARD',
  LESSON_PURCHASE: 'LESSON_PURCHASE',
  SHOP_PURCHASE: 'SHOP_PURCHASE',
  SUBSCRIPTION_DISCOUNT: 'SUBSCRIPTION_DISCOUNT',
  ADMIN_ADJUST: 'ADMIN_ADJUST'
} as const
