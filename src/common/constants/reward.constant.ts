export const RewardType = {
  LESSON: 'LESSON',
  DAILY_REQUEST: 'DAILY_REQUEST',
  EVENT: 'EVENT',
  ACHIEVEMENT: 'ACHIEVEMENT',
  LEVEL: 'LEVEL',
  EXERCISE: 'EXERCISE'
} as const

export const RewardTarget = {
  EXP: 'EXP',
  POKEMON: 'POKEMON',
  POKE_COINS: 'POKE_COINS',
  SPARKLES: 'SPARKLES'
} as const

export const RewardClaimStatus = {
  PENDING: 'PENDING',
  CLAIMED: 'CLAIMED',
  COMPLETED: 'COMPLETED'
} as const
