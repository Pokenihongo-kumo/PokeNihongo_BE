export const AchievementTierType = {
  BASIC: 'BASIC',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  MASTER: 'MASTER'
} as const

export const AchievementType = {
  COMPLETE_LESSON: 'COMPLETE_LESSON',
  PLACEMENT_TEST_DONE: 'PLACEMENT_TEST_DONE',
  LEARNING_STREAK: 'LEARNING_STREAK'
} as const

export const dailyRequestType = {
  DAILY_LOGIN: 'DAILY_LOGIN',
  DAILY_LESSON: 'DAILY_LESSON',
  DAILY_EXERCISE: 'DAILY_EXERCISE',
  STREAK_LOGIN: 'STREAK_LOGIN',
  STREAK_LESSON: 'STREAK_LESSON',
  STREAK_EXCERCISE: 'STREAK_EXCERCISE'
} as const

export type DailyRequestTypeType = keyof typeof dailyRequestType

export const UserAchievementStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED_NOT_CLAIMED: 'COMPLETED_NOT_CLAIMED',
  CLAIMED: 'CLAIMED'
} as const
