import {
  AchievementTierType,
  AchievementType
} from '@/common/constants/achievement.constant'
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

//type
export type Achievement = z.infer<typeof AchievementSchema>

// field
type AchievementFieldType = keyof z.infer<typeof AchievementSchema>
export const ACHIEVEMENT_FIELDS = [
  ...Object.keys(AchievementSchema.shape),
  'nameTranslation',
  'descriptionTranslation',
  'conditionTextTranslation'
] as AchievementFieldType[]
