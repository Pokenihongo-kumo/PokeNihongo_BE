import { checkIdSchema } from '@/common/utils/id.validation'
import { RewardMessage } from '@/i18n/message-keys'
import { UserRewardSourceTypeSchema } from '@/modules/user-reward-history/entities/user-reward-history.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { RewardSchema } from '../entities/reward.entity'

export const CreateRewardBodyInputSchema = RewardSchema.pick({
  rewardType: true,
  rewardItem: true,
  rewardTarget: true
})
  .strict()
  .extend({
    nameTranslations: TranslationInputSchema
  })

export type CreateRewardBodyInput = z.infer<typeof CreateRewardBodyInputSchema>

export class CreatedRewardBodyInputDTO extends createZodDto(
  CreateRewardBodyInputSchema
) {}

export const CreateRewardBodySchema = RewardSchema.pick({
  nameKey: true,
  rewardType: true,
  rewardItem: true,
  rewardTarget: true
}).strict()

export type CreateRewardBody = z.infer<typeof CreateRewardBodySchema>

export const CreateRewardResSchema = resSchema(RewardSchema)

export type CreateRewardRes = z.infer<typeof CreateRewardResSchema>

export class CreateRewardResDTO extends createZodDto(CreateRewardResSchema) {}

export const UpdateRewardBodyInputSchema = CreateRewardBodyInputSchema.partial().strict()

export type UpdateRewardBodyInput = z.infer<typeof UpdateRewardBodyInputSchema>

export class UpdateRewardBodyInputDTO extends createZodDto(UpdateRewardBodyInputSchema) {}

export const UpdateRewardBodySchema = CreateRewardBodySchema.partial().strict()

export type UpdateRewardBody = z.infer<typeof UpdateRewardBodySchema>

export const UpdateRewardResSchema = CreateRewardResSchema

export type UpdateRewardRes = z.infer<typeof UpdateRewardResSchema>

export class UpdateRewardResDTO extends createZodDto(UpdateRewardResSchema) {}

export const GetRewardParamsSchema = z
  .object({
    rewardId: checkIdSchema(RewardMessage.INVALID_DATA)
  })
  .strict()

export type GetRewardParams = z.infer<typeof GetRewardParamsSchema>

export class GetRewardParamsDTO extends createZodDto(GetRewardParamsSchema) {}

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

export type GetRewardDetailWithAllLangRes = z.infer<
  typeof GetRewardDetailWithAllLangResSchema
>

export class GetRewardDetailWithAllLangResDTO extends createZodDto(
  GetRewardDetailWithAllLangResSchema
) {}

export const GetRewardDetailResSchema = resSchema(
  RewardSchema.extend({
    nameTranslation: z.string().nullable().optional()
  })
)

export type GetRewardDetailRes = z.infer<typeof GetRewardDetailResSchema>

export class GetRewardDetailResDTO extends createZodDto(GetRewardDetailResSchema) {}

export const ConvertRewardsBodySchema = z
  .object({
    rewardIds: z.array(z.number().int().positive()).min(1),
    userId: z.number().int().positive().optional(),
    sourceType: UserRewardSourceTypeSchema.optional()
  })
  .strict()

export type ConvertRewardsBody = z.infer<typeof ConvertRewardsBodySchema>

export class ConvertRewardsBodyDTO extends createZodDto(ConvertRewardsBodySchema) {}

export const ConvertRewardsResSchema = resSchema(
  z.object({
    exp: z.unknown().nullable(),
    pokeCoins: z.unknown().nullable(),
    sparkles: z.unknown().nullable(),
    pokemons: z.array(z.unknown())
  })
)

export type ConvertRewardsRes = z.infer<typeof ConvertRewardsResSchema>

export class ConvertRewardsResDTO extends createZodDto(ConvertRewardsResSchema) {}
