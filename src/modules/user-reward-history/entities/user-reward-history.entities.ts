import { UserRewardHistoryMessage } from '@/i18n/message-keys'
import { z } from 'zod'

export const invalid = { message: UserRewardHistoryMessage.INVALID_DATA }
export const RewardTargetSchema = z.enum(['EXP', 'POKEMON', 'POKE_COINS', 'SPARKLES'], {
  errorMap: () => ({ message: UserRewardHistoryMessage.INVALID_DATA })
})

export const UserRewardSourceTypeSchema = z.enum(
  [
    'REWARD_SERVICE',
    'LESSON',
    'DAILY_REQUEST',
    'ATTENDANCE',
    'SEASON_REWARD',
    'ADMIN_ADJUST',
    'OTHER',
    'ACHIEVEMENT_REWARD',
    'EXERCISE'
  ],
  { errorMap: () => invalid }
)

export const RewardInfoSchema = z.object({
  id: z.number(),
  name: z.string().nullable().optional(),
  rewardType: z.string(),
  rewardItem: z.number(),
  rewardTarget: RewardTargetSchema
})

export const UserRewardHistorySchema = z.object({
  id: z.number(),
  userId: z.number(),
  rewardId: z.number().nullable(),
  rewardTargetSnapshot: RewardTargetSchema.nullable(),
  amount: z.number().nullable().optional(),
  sourceType: UserRewardSourceTypeSchema,
  sourceId: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
  meta: z.unknown().nullable().optional(),
  createdAt: z.date(),
  reward: RewardInfoSchema.optional()
})

export type UserRewardHistory = z.infer<typeof UserRewardHistorySchema>
