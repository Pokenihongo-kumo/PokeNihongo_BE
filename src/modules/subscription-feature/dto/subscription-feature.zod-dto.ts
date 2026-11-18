import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GetSubscriptionFeatureDetailSchema,
  SubscriptionFeatureSchema
} from '../entities/subscription-feature.entity'

// Create Schema

export const CreateSubscriptionFeatureBodySchema = SubscriptionFeatureSchema.pick({
  subscriptionId: true,
  featureId: true,
  value: true
}).strict()

export type CreateSubscriptionFeatureBody = z.infer<
  typeof CreateSubscriptionFeatureBodySchema
>

export const CreateSubscriptionFeatureResSchema = resSchema(SubscriptionFeatureSchema)

// Update Schema

export const UpdateSubscriptionFeatureBodySchema =
  CreateSubscriptionFeatureBodySchema.partial().strict()

export type UpdateSubscriptionFeatureBody = z.infer<
  typeof UpdateSubscriptionFeatureBodySchema
>

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

export type GetSubscriptionFeatureParams = z.infer<
  typeof GetSubscriptionFeatureParamsSchema
>

export const GetSubscriptionFeatureDetailResSchema = resSchema(
  GetSubscriptionFeatureDetailSchema
)
