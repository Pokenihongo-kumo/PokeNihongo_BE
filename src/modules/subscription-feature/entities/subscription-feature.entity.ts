import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base SubscriptionFeature Schema
export const SubscriptionFeatureSchema = z.object({
  id: z.number(),
  subscriptionId: z.number(),
  featureId: z.number(),

  value: z.string().nullable(),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateSubscriptionFeatureBodySchema = SubscriptionFeatureSchema.pick({
  subscriptionId: true,
  featureId: true,
  value: true
}).strict()

export const CreateSubscriptionFeatureResSchema = resSchema(SubscriptionFeatureSchema)

// Update Schema
export const UpdateSubscriptionFeatureBodySchema =
  CreateSubscriptionFeatureBodySchema.partial().strict()

export const UpdateSubscriptionFeatureResSchema = CreateSubscriptionFeatureResSchema

// Update with list of features for a subscription
export const UpdateWithListItemBodySchema = z.object({
  items: z
    .array(
      z.object({
        featureId: SubscriptionFeatureSchema.shape.featureId,
        value: SubscriptionFeatureSchema.shape.value
      })
    )
    .min(1)
})

export type UpdateWithListItemBody = z.infer<typeof UpdateWithListItemBodySchema>

export const UpdateWithListItemResSchema = resSchema(z.array(SubscriptionFeatureSchema))

// Query Schema
export const GetSubscriptionFeatureParamsSchema = z.object({
  subscriptionFeatureId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetSubscriptionFeatureDetailSchema = SubscriptionFeatureSchema

export const GetSubscriptionFeatureDetailResSchema = resSchema(
  GetSubscriptionFeatureDetailSchema
)

// Type exports
export type SubscriptionFeature = z.infer<typeof SubscriptionFeatureSchema>
export type CreateSubscriptionFeatureBody = z.infer<
  typeof CreateSubscriptionFeatureBodySchema
>
export type UpdateSubscriptionFeatureBody = z.infer<
  typeof UpdateSubscriptionFeatureBodySchema
>
export type GetSubscriptionFeatureParams = z.infer<
  typeof GetSubscriptionFeatureParamsSchema
>

// Field for query
export type SubscriptionFeatureFieldType = keyof z.infer<typeof SubscriptionFeatureSchema>
export const USER_GACHA_PITY_FIELDS = Object.keys(
  SubscriptionFeatureSchema.shape
) as SubscriptionFeatureFieldType[]
