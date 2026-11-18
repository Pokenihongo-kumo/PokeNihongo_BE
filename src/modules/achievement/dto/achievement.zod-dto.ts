import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { RewardSchema } from '@/modules/reward/entities/reward.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { AchievementSchema } from '../entities/achievement.entity'

export const CreateAchievementBodyInputSchema = AchievementSchema.pick({
  imageUrl: true,
  isActive: true,
  achievementTierType: true,
  conditionType: true,
  conditionValue: true,
  conditionElementId: true,
  rewardId: true,
  groupId: true
})
  .extend({
    nameTranslations: TranslationInputSchema,
    descriptionTranslations: TranslationInputSchema,
    conditionTextTranslations: TranslationInputSchema
  })
  .strict()

export type CreateAchievementBodyInput = z.infer<typeof CreateAchievementBodyInputSchema>

export class CreateAchievementBodyInputDTO extends createZodDto(
  CreateAchievementBodyInputSchema
) {}

export const CreateAchievementBodySchema = AchievementSchema.pick({
  imageUrl: true,
  nameKey: true,
  isActive: true,
  descriptionKey: true,
  conditionTextKey: true,
  achievementTierType: true,
  conditionType: true,
  conditionValue: true,
  conditionElementId: true,
  rewardId: true,
  groupId: true
})

export type CreateAchievementBody = z.infer<typeof CreateAchievementBodySchema>

export const CreateAchievementResSchema = resSchema(AchievementSchema)

export class CreateAchievementResDTO extends createZodDto(CreateAchievementResSchema) {}

export const UpdateAchievementBodyInputSchema = CreateAchievementBodyInputSchema.partial()

export type UpdateAchievementBodyInput = z.infer<typeof UpdateAchievementBodyInputSchema>

export class UpdateAchievementBodyInputDTO extends createZodDto(
  UpdateAchievementBodyInputSchema
) {}

export const UpdateAchievementBodySchema = CreateAchievementBodySchema.partial()

export type UpdateAchievementBody = z.infer<typeof UpdateAchievementBodySchema>

export const UpdateAchievementResSchema = CreateAchievementResSchema

export class UpdateAchievementResDTO extends createZodDto(UpdateAchievementResSchema) {}

export const GetAchievementParamsSchema = z
  .object({
    achievementId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
  })
  .strict()

export type GetAchievementParams = z.infer<typeof GetAchievementParamsSchema>

export class GetAchievementParamsDTO extends createZodDto(GetAchievementParamsSchema) {}

export const GetAchievementDetailResSchema = resSchema(
  AchievementSchema.extend({
    nameTranslation: z.string().nullable(),
    nameTranslations: TranslationInputSchema.optional().nullable(),
    descriptionTranslation: z.string().nullable(),
    descriptionTranslations: TranslationInputSchema.optional().nullable(),
    conditionTextTranslation: z.string().nullable(),
    conditionTextTranslations: TranslationInputSchema.optional().nullable(),
    reward: RewardSchema.extend({
      nameTranslation: z.string().nullable(),
      nameTranslations: TranslationInputSchema.optional().nullable()
    }).nullable()
  })
)

export type GetAchievementDetailRes = z.infer<typeof GetAchievementDetailResSchema>

export class GetAchievementDetailResDTO extends createZodDto(
  GetAchievementDetailResSchema
) {}
