import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { AchievementSchema } from '@/modules/achievement/entities/achievement.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { AchievementGroupSchema } from '../entities/achievement-group.entity'

export const CreateAchievementGroupBodyInputSchema = AchievementGroupSchema.pick({
  displayOrder: true,
  isActive: true
})
  .extend({
    nameTranslations: TranslationInputSchema
  })
  .strict()

export type CreateAchievementGroupBodyInput = z.infer<
  typeof CreateAchievementGroupBodyInputSchema
>

export class CreateAchievementGroupBodyInputDTO extends createZodDto(
  CreateAchievementGroupBodyInputSchema
) {}

export const CreateAchievementGroupBodySchema = AchievementGroupSchema.pick({
  displayOrder: true,
  isActive: true,
  nameKey: true
})

export type CreateAchievementGroupBody = z.infer<typeof CreateAchievementGroupBodySchema>

export const CreateAchievementGroupResSchema = resSchema(AchievementGroupSchema)

export class CreateAchievementGroupResDTO extends createZodDto(
  CreateAchievementGroupResSchema
) {}

export const UpdateAchievementGroupBodyInputSchema =
  CreateAchievementGroupBodyInputSchema.partial()

export type UpdateAchievementGroupBodyInput = z.infer<
  typeof UpdateAchievementGroupBodyInputSchema
>

export class UpdateAchievementGroupBodyInputDTO extends createZodDto(
  UpdateAchievementGroupBodyInputSchema
) {}

export const UpdateAchievementGroupBodySchema = CreateAchievementGroupBodySchema.partial()

export type UpdateAchievementGroupBody = z.infer<typeof UpdateAchievementGroupBodySchema>

export const UpdateAchievementGroupResSchema = CreateAchievementGroupResSchema

export class UpdateAchievementGroupResDTO extends createZodDto(
  UpdateAchievementGroupResSchema
) {}

export const GetAchievementGroupParamsSchema = z
  .object({
    achievementGroupId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
  })
  .strict()

export class GetAchievementGroupParamsDTO extends createZodDto(
  GetAchievementGroupParamsSchema
) {}

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

export class GetAchievementGroupDetailResDTO extends createZodDto(
  GetAchievementGroupDetailResSchema
) {}
