export const TagNameSubscription = {
  NORMAL: 'NORMAL',
  COMBO: 'COMBO',
  ULTRA: 'ULTRA'
} as const

export const SubscriptionType = {
  LIFETIME: 'LIFETIME',
  RECURRING: 'RECURRING'
} as const

export const FeatureKey = {
  UNLOCK_READING: 'UNLOCK_READING',
  UNLOCK_LISTENING: 'UNLOCK_LISTENING',
  XP_MULTIPLIER: 'XP_MULTIPLIER',
  COIN_MULTIPLIER: 'COIN_MULTIPLIER',
  UNLIMITED_TESTS: 'UNLIMITED_TESTS',
  AI_KAIWA: 'AI_KAIWA',
  PERSONALIZED_RECOMMENDATIONS: 'PERSONALIZED_RECOMMENDATIONS'
} as const
export type FeatureKeyType = keyof typeof FeatureKey

export const UserSubscriptionStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  ACTIVE: 'ACTIVE',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  CANCELED: 'CANCELED'
} as const

export type UserSubscriptionStatusType = keyof typeof UserSubscriptionStatus

// PokeCoin may pay at most half of a plan's price (whole coins)
export const MAX_POKE_COIN_DISCOUNT_RATIO = 0.5
export const maxPokeCoinDiscount = (price: number) =>
  Math.floor(price * MAX_POKE_COIN_DISCOUNT_RATIO)
