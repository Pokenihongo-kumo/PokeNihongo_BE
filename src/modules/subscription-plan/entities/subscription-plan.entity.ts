import { SubscriptionType } from '@/common/constants/subscription.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { FeatureSchema } from '@/modules/feature/entities/feature.entity'
import { SubscriptionFeatureSchema } from '@/modules/subscription-feature/entities/subscription-feature.entity'
import { SubscriptionSchema } from '@/modules/subscription/entities/subscription.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base SubscriptionPlan Schema
export const SubscriptionPlanSchema = z.object({
  id: z.number(),
  subscriptionId: z.number(),
  isActive: z.boolean().default(true),
  price: z.number().min(0),
  type: z.enum([SubscriptionType.LIFETIME, SubscriptionType.RECURRING]),
  durationInDays: z.number().min(0).nullable(),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateSubscriptionPlanBodySchema = SubscriptionPlanSchema.pick({
  subscriptionId: true,
  isActive: true,
  price: true,
  type: true,
  durationInDays: true
}).strict()

export const CreateSubscriptionPlanResSchema = resSchema(SubscriptionPlanSchema)

// Update Schema
export const UpdateSubscriptionPlanBodySchema =
  CreateSubscriptionPlanBodySchema.partial().strict()

export const UpdateSubscriptionPlanResSchema = CreateSubscriptionPlanResSchema

export const UpdateWithListItemResSchema = resSchema(z.array(SubscriptionPlanSchema))

// Query Schema
export const GetSubscriptionPlanParamsSchema = z.object({
  subscriptionPlanId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetSubscriptionPlanDetailSchema = SubscriptionPlanSchema.extend({
  subscription: SubscriptionSchema.extend({
    nameTranslation: z.string().nullable().optional(),
    nameTranslations: TranslationInputSchema.nullable().optional(),
    descriptionTranslation: z.string().nullable().optional(),
    descriptionTranslations: TranslationInputSchema.nullable().optional(),
    features: z.array(
      SubscriptionFeatureSchema.pick({
        id: true,
        featureId: true,
        value: true
      }).extend({
        feature: FeatureSchema.pick({
          id: true,
          featureKey: true,
          nameKey: true
        }).extend({
          nameTranslation: z.string().nullable().optional(),
          nameTranslations: TranslationInputSchema.nullable().optional()
        })
      })
    )
  }).nullable()
})

export const GetDiscountBySubPlanResSchema = resSchema(
  z.object({
    availablePokeCoins: z.number(),
    maxPokeCoinsCanUse: z.number(),
    maxDiscountAllowed: z.number()
  })
)
export const GetSubscriptionPlanDetailResSchema = resSchema(
  GetSubscriptionPlanDetailSchema
)

// Type exports
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>
export type CreateSubscriptionPlanBody = z.infer<typeof CreateSubscriptionPlanBodySchema>
export type UpdateSubscriptionPlanBody = z.infer<typeof UpdateSubscriptionPlanBodySchema>
export type GetSubscriptionPlanParams = z.infer<typeof GetSubscriptionPlanParamsSchema>

// Field for query
export type SubscriptionPlanFieldType = keyof z.infer<typeof SubscriptionPlanSchema>
export const USER_GACHA_PITY_FIELDS = Object.keys(
  SubscriptionPlanSchema.shape
) as SubscriptionPlanFieldType[]
