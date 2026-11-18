import { RewardTarget, RewardType } from '@/common/constants/reward.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { RewardMessage } from '@/i18n/message-keys'
import { UserRewardSourceTypeSchema } from '@/modules/user-reward-history/entities/user-reward-history.entities'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
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

export const CreateRewardBodyInputSchema = RewardSchema.pick({
  rewardType: true,
  rewardItem: true,
  rewardTarget: true
})
  .strict()
  .extend({
    nameTranslations: TranslationInputSchema
  })

export const CreateRewardBodySchema = RewardSchema.pick({
  nameKey: true,
  rewardType: true,
  rewardItem: true,
  rewardTarget: true
}).strict()

export const CreateRewardResSchema = resSchema(RewardSchema)

export const UpdateRewardBodyInputSchema = CreateRewardBodyInputSchema.partial().strict()

export const UpdateRewardBodySchema = CreateRewardBodySchema.partial().strict()

export const UpdateRewardResSchema = CreateRewardResSchema

export const GetRewardParamsSchema = z
  .object({
    rewardId: checkIdSchema(RewardMessage.INVALID_DATA)
  })
  .strict()

export const GetRewardDetailWithAllLangResSchema = resSchema(
  RewardSchema.extend({
    nameTranslations: z
      .array(
        z.object({
          key: z.string(),
          value: z.string()
        })
      )
      .optional()
  })
)

export const GetRewardDetailResSchema = resSchema(
  RewardSchema.extend({
    nameTranslation: z.string().nullable().optional()
  })
)

export const ConvertRewardsBodySchema = z
  .object({
    rewardIds: z.array(z.number().int().positive()).min(1),
    userId: z.number().int().positive().optional(),
    sourceType: UserRewardSourceTypeSchema.optional()
  })
  .strict()

export const ConvertRewardsResSchema = resSchema(
  z.object({
    exp: z.unknown().nullable(),
    pokeCoins: z.unknown().nullable(),
    sparkles: z.unknown().nullable(),
    pokemons: z.array(z.unknown())
  })
)

export type Reward = z.infer<typeof RewardSchema>
export type CreateRewardBodyInput = z.infer<typeof CreateRewardBodyInputSchema>
export type CreateRewardBody = z.infer<typeof CreateRewardBodySchema>
export type UpdateRewardBodyInput = z.infer<typeof UpdateRewardBodyInputSchema>
export type UpdateRewardBody = z.infer<typeof UpdateRewardBodySchema>
export type GetRewardParams = z.infer<typeof GetRewardParamsSchema>
export type GetRewardDetailRes = z.infer<typeof GetRewardDetailResSchema>
export type ConvertRewardsBody = z.infer<typeof ConvertRewardsBodySchema>
export type ConvertRewardsRes = z.infer<typeof ConvertRewardsResSchema>

type RewardFieldType = keyof z.infer<typeof RewardSchema>
export const REWARD_FIELDS = [
  ...Object.keys(RewardSchema.shape),
  'nameTranslation'
] as RewardFieldType[]
