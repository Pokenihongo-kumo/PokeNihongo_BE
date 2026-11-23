import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { RewardSchema } from '@/modules/reward/entities/reward.entity'
import { TranslationSchema } from '@/modules/translation/entities/translation.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { DailyRequestSchema } from '../entities/daily-request.entity'

export const CreateDailyRequestBodyInputSchema = DailyRequestSchema.pick({
  dailyRequestType: true,
  conditionValue: true,
  rewardId: true,
  isActive: true,
  isStreak: true
})
  .extend({
    nameTranslations: TranslationInputSchema,
    descriptionTranslations: TranslationInputSchema
  })
  .strict()

export type CreateDailyRequestBodyInput = z.infer<
  typeof CreateDailyRequestBodyInputSchema
>

export class CreateDailyRequestBodyInputDTO extends createZodDto(
  CreateDailyRequestBodyInputSchema
) {}

export const CreateDailyRequestBodySchema = DailyRequestSchema.pick({
  nameKey: true,
  descriptionKey: true,
  dailyRequestType: true,
  conditionValue: true,
  rewardId: true,
  isActive: true,
  isStreak: true
}).strict()

export type CreateDailyRequestBody = z.infer<typeof CreateDailyRequestBodySchema>

export const CreateDailyRequestResSchema = resSchema(DailyRequestSchema)

export type CreateDailyRequestRes = z.infer<typeof CreateDailyRequestResSchema>

export class CreateDailyRequestResDTO extends createZodDto(CreateDailyRequestResSchema) {}

export const UpdateDailyRequestBodyInputSchema =
  CreateDailyRequestBodyInputSchema.partial().strict()

export type UpdateDailyRequestBodyInput = z.infer<
  typeof UpdateDailyRequestBodyInputSchema
>

export class UpdateDailyRequestBodyInputDTO extends createZodDto(
  UpdateDailyRequestBodyInputSchema
) {}

export const UpdateDailyRequestBodySchema =
  CreateDailyRequestBodySchema.partial().strict()

export type UpdateDailyRequestBody = z.infer<typeof UpdateDailyRequestBodySchema>

export const UpdateDailyRequestResSchema = CreateDailyRequestResSchema

export type UpdateDailyRequestRes = z.infer<typeof UpdateDailyRequestResSchema>

export class UpdateDailyRequestResDTO extends createZodDto(UpdateDailyRequestResSchema) {}

export const GetParamsDailyRequestSchema = z.object({
  dailyRequestId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export type GetDailyRequestParams = z.infer<typeof GetParamsDailyRequestSchema>

export class GetDailyRequestParamsDTO extends createZodDto(GetParamsDailyRequestSchema) {}

export const GetDailyRequestDetailResSchema = resSchema(
  DailyRequestSchema.extend({
    nameTranslation: z.string().nullable().optional(),
    descriptionTranslation: z.string().nullable().optional(),
    reward: RewardSchema.extend({
      nameTranslations: z
        .array(TranslationSchema.pick({ id: true, languageId: true, value: true }))
        .optional()
    })
      .nullable()
      .optional()
  })
)

export type GetDailyRequestDetailRes = z.infer<typeof GetDailyRequestDetailResSchema>

export class GetDailyRequestDetailResDTO extends createZodDto(
  GetDailyRequestDetailResSchema
) {}

export const GetDailyRequestDetailwithAllLangResSchema = resSchema(
  DailyRequestSchema.extend({
    nameTranslations: z.array(z.object({ key: z.string(), value: z.string() })),
    descriptionTranslations: z.array(z.object({ key: z.string(), value: z.string() })),
    reward: RewardSchema.extend({
      nameTranslations: z
        .array(TranslationSchema.pick({ id: true, languageId: true, value: true }))
        .optional()
    })
      .nullable()
      .optional()
  })
)

export type GetDailyRequestDetailwithAllLangRes = z.infer<
  typeof GetDailyRequestDetailwithAllLangResSchema
>

export class GetDailyRequestDetailwithAllLangResDTO extends createZodDto(
  GetDailyRequestDetailwithAllLangResSchema
) {}
