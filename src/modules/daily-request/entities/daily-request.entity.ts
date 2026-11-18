import { dailyRequestType } from '@/common/constants/achievement.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { RewardSchema } from '@/modules/reward/entities/reward.entity'
import { TranslationSchema } from '@/modules/translation/entities/translation.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const DailyRequestSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  descriptionKey: z.string(),
  dailyRequestType: z
    .enum([
      dailyRequestType.DAILY_LOGIN,
      dailyRequestType.DAILY_LESSON,
      dailyRequestType.DAILY_EXERCISE,
      dailyRequestType.STREAK_LOGIN,
      dailyRequestType.STREAK_LESSON,
      dailyRequestType.STREAK_EXCERCISE
    ])
    .default(dailyRequestType.DAILY_LESSON),
  conditionValue: z.number().min(1),
  rewardId: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
  isStreak: z.boolean().default(false),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

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

export const CreateDailyRequestBodySchema = DailyRequestSchema.pick({
  nameKey: true,
  descriptionKey: true,
  dailyRequestType: true,
  conditionValue: true,
  rewardId: true,
  isActive: true,
  isStreak: true
}).strict()

export const CreateDailyRequestResSchema = resSchema(DailyRequestSchema)

export const UpdateDailyRequestBodyInputSchema =
  CreateDailyRequestBodyInputSchema.partial().strict()

export const UpdateDailyRequestBodySchema =
  CreateDailyRequestBodySchema.partial().strict()

export const UpdateDailyRequestResSchema = CreateDailyRequestResSchema

export const GetParamsDailyRequestSchema = z.object({
  dailyRequestId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

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

// Type definitions
export type DailyRequest = z.infer<typeof DailyRequestSchema>

export type CreateDailyRequestBodyInput = z.infer<
  typeof CreateDailyRequestBodyInputSchema
>

export type CreateDailyRequestBody = z.infer<typeof CreateDailyRequestBodySchema>

export type UpdateDailyRequestBodyInput = z.infer<
  typeof UpdateDailyRequestBodyInputSchema
>

export type UpdateDailyRequestBody = z.infer<typeof UpdateDailyRequestBodySchema>

export type GetParamsDailyRequest = z.infer<typeof GetParamsDailyRequestSchema>

export type GetParamDailyRequestDetail = z.infer<typeof GetDailyRequestDetailResSchema>

// Field

type DailyRequestFieldType = keyof z.infer<typeof DailyRequestSchema>
export const DAILY_REQUEST_FIELDS = [
  ...Object.keys(DailyRequestSchema.shape),
  'nameTranslation',
  'descriptionTranslation'
] as DailyRequestFieldType[]
