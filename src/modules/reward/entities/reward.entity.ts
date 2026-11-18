import { RewardTarget, RewardType } from '@/common/constants/reward.constant'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const RewardSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  rewardType: z.enum([
    RewardType.LESSON,
    RewardType.DAILY_REQUEST,
    RewardType.EVENT,
    RewardType.ACHIEVEMENT,
    RewardType.LEVEL,
    RewardType.EXERCISE
  ]),
  rewardItem: z.number().min(0),
  rewardTarget: z.enum([
    RewardTarget.EXP,
    RewardTarget.POKEMON,
    RewardTarget.POKE_COINS,
    RewardTarget.SPARKLES
  ]),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type Reward = z.infer<typeof RewardSchema>
type RewardFieldType = keyof z.infer<typeof RewardSchema>
export const REWARD_FIELDS = [
  ...Object.keys(RewardSchema.shape),
  'nameTranslation'
] as RewardFieldType[]
