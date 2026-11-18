import { FeatureKey } from '@/common/constants/subscription.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { FeatureMessage } from '@/i18n/message-keys'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const FeatureSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  featureKey: z.enum([
    FeatureKey.COIN_MULTIPLIER,
    FeatureKey.UNLIMITED_TESTS,
    FeatureKey.UNLOCK_LISTENING,
    FeatureKey.UNLOCK_READING,
    FeatureKey.XP_MULTIPLIER,
    FeatureKey.AI_KAIWA,
    FeatureKey.PERSONALIZED_RECOMMENDATIONS
  ]),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateFeatureBodyInputSchema = FeatureSchema.pick({
  featureKey: true
})
  .strict()
  .extend({
    nameTranslations: TranslationInputSchema
  })

export const CreateFeatureBodySchema = FeatureSchema.pick({
  nameKey: true,
  featureKey: true
}).strict()

export const CreateFeatureResSchema = resSchema(FeatureSchema)

export const UpdateFeatureBodyInputSchema =
  CreateFeatureBodyInputSchema.partial().strict()

export const UpdateFeatureBodySchema = CreateFeatureBodySchema.partial().strict()

export const UpdateFeatureResSchema = CreateFeatureResSchema

export const GetFeatureParamsSchema = z
  .object({
    featureId: checkIdSchema(FeatureMessage.INVALID_DATA)
  })
  .strict()

export const GetFeatureDetailWithAllLangResSchema = resSchema(
  FeatureSchema.extend({
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

export const GetFeatureDetailResSchema = resSchema(
  FeatureSchema.extend({
    nameTranslation: z.string().nullable().optional(),
    nameTranslations: TranslationInputSchema.nullable().optional()
  })
)

export type Feature = z.infer<typeof FeatureSchema>
export type CreateFeatureBodyInput = z.infer<typeof CreateFeatureBodyInputSchema>
export type CreateFeatureBody = z.infer<typeof CreateFeatureBodySchema>
export type UpdateFeatureBodyInput = z.infer<typeof UpdateFeatureBodyInputSchema>
export type UpdateFeatureBody = z.infer<typeof UpdateFeatureBodySchema>
export type GetFeatureParams = z.infer<typeof GetFeatureParamsSchema>
export type GetFeatureDetailRes = z.infer<typeof GetFeatureDetailResSchema>

type FeatureFieldType = keyof z.infer<typeof FeatureSchema>
export const LEADERBOARD_SEASON_FIELDS = [
  ...Object.keys(FeatureSchema.shape),
  'nameTranslation',
  'descriptionTranslation'
] as FeatureFieldType[]
