import {
  AchievementTierType,
  AchievementType
} from '@/common/constants/achievement.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { RewardSchema } from '@/modules/reward/entities/reward.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

const conditionMetaSchema = z.union([z.object({ type: z.number().optional() }), z.null()])

export const AchievementSchema = z.object({
  id: z.number(),
  nameKey: z.string().min(1),
  descriptionKey: z.string().min(1),
  conditionTextKey: z.string().min(1),
  imageUrl: z.string().url().nullable(),
  isActive: z.boolean().default(true),

  achievementTierType: z
    .enum([
      AchievementTierType.BASIC,
      AchievementTierType.INTERMEDIATE,
      AchievementTierType.ADVANCED,
      AchievementTierType.MASTER
    ])
    .nullable()
    .default(null),
  conditionType: z.enum([
    AchievementType.COMPLETE_LESSON,
    AchievementType.LEARNING_STREAK
  ]),
  conditionValue: z.number().nullable(),
  conditionElementId: z.number().nullable(),
  rewardId: z.number().nullable(),
  groupId: z.number(),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

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

export const CreateAchievementResSchema = resSchema(AchievementSchema)

export const UpdateAchievementBodyInputSchema = CreateAchievementBodyInputSchema.partial()
export const UpdateAchievementBodySchema = CreateAchievementBodySchema.partial()

export const UpdateAchievementResSchema = CreateAchievementResSchema

export const GetAchievementParamsSchema = z
  .object({
    achievementId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
  })
  .strict()

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

//type
export type Achievement = z.infer<typeof AchievementSchema>

export type CreateAchievementBodyInput = z.infer<typeof CreateAchievementBodyInputSchema>

export type CreateAchievementBody = z.infer<typeof CreateAchievementBodySchema>

export type UpdateAchievementBodyInput = z.infer<typeof UpdateAchievementBodyInputSchema>

export type UpdateAchievementBody = z.infer<typeof UpdateAchievementBodySchema>

export type GetAchievementParams = z.infer<typeof GetAchievementParamsSchema>

export type GetAchievementDetailRes = z.infer<typeof GetAchievementDetailResSchema>

// field
type AchievementFieldType = keyof z.infer<typeof AchievementSchema>
export const ACHIEVEMENT_FIELDS = [
  ...Object.keys(AchievementSchema.shape),
  'nameTranslation',
  'descriptionTranslation',
  'conditionTextTranslation'
] as AchievementFieldType[]
