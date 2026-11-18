import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { AchievementSchema } from '@/modules/achievement/entities/achievement.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const AchievementGroupSchema = z.object({
  id: z.number(),
  nameKey: z.string().min(1),
  displayOrder: z.number().min(0),
  isActive: z.boolean().default(true),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateAchievementGroupBodyInputSchema = AchievementGroupSchema.pick({
  displayOrder: true,
  isActive: true
})
  .extend({
    nameTranslations: TranslationInputSchema
  })
  .strict()

export const CreateAchievementGroupBodySchema = AchievementGroupSchema.pick({
  displayOrder: true,
  isActive: true,
  nameKey: true
})

export const CreateAchievementGroupResSchema = resSchema(AchievementGroupSchema)

export const UpdateAchievementGroupBodyInputSchema =
  CreateAchievementGroupBodyInputSchema.partial()
export const UpdateAchievementGroupBodySchema = CreateAchievementGroupBodySchema.partial()

export const UpdateAchievementGroupResSchema = CreateAchievementGroupResSchema

export const GetAchievementGroupParamsSchema = z
  .object({
    achievementGroupId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
  })
  .strict()

export const GetAchievementGroupDetailResSchema = resSchema(
  AchievementGroupSchema.extend({
    nameTranslation: z.string().nullable().optional(),
    nameTranslations: TranslationInputSchema.optional().nullable(),
    achievements: z.array(
      AchievementSchema.extend({
        nameTranslation: z.string().nullable(),
        nameTranslations: TranslationInputSchema.optional().nullable(),
        descriptionTranslation: z.string().nullable(),
        descriptionTranslations: TranslationInputSchema.optional().nullable(),
        conditionTextTranslation: z.string().nullable(),
        conditionTextTranslations: TranslationInputSchema.optional().nullable()
      }).nullable()
    )
  })
)

//type
export type AchievementGroupType = z.infer<typeof AchievementGroupSchema>

export type CreateAchievementGroupBodyInputType = z.infer<
  typeof CreateAchievementGroupBodyInputSchema
>

export type CreateAchievementGroupBodyType = z.infer<
  typeof CreateAchievementGroupBodySchema
>

export type UpdateAchievementGroupBodyInputType = z.infer<
  typeof UpdateAchievementGroupBodyInputSchema
>

export type UpdateAchievementGroupBodyType = z.infer<
  typeof UpdateAchievementGroupBodySchema
>

export type GetAchievementGroupParamsType = z.infer<
  typeof GetAchievementGroupParamsSchema
>

export type GetAchievementGroupDetailResType = z.infer<
  typeof GetAchievementGroupDetailResSchema
>

// field
type AchievementGroupFieldType = keyof z.infer<typeof AchievementGroupSchema>
export const ACHIEVEMENT_GROUP_FIELDS = [
  ...Object.keys(AchievementGroupSchema.shape),
  'nameTranslation'
] as AchievementGroupFieldType[]
