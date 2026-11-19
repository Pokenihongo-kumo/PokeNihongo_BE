import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GetSubscriptionPlanDetailSchema,
  SubscriptionPlanSchema
} from '../entities/subscription-plan.entity'

// Create Schema

export const CreateSubscriptionPlanBodySchema = SubscriptionPlanSchema.pick({
  subscriptionId: true,
  isActive: true,
  price: true,
  type: true,
  durationInDays: true
}).strict()

export type CreateSubscriptionPlanBody = z.infer<typeof CreateSubscriptionPlanBodySchema>

export const CreateSubscriptionPlanResSchema = resSchema(SubscriptionPlanSchema)

// Update Schema

export const UpdateSubscriptionPlanBodySchema =
  CreateSubscriptionPlanBodySchema.partial().strict()

export type UpdateSubscriptionPlanBody = z.infer<typeof UpdateSubscriptionPlanBodySchema>

export const UpdateSubscriptionPlanResSchema = CreateSubscriptionPlanResSchema

export const UpdateWithListItemResSchema = resSchema(z.array(SubscriptionPlanSchema))

// Query Schema

export const GetSubscriptionPlanParamsSchema = z.object({
  subscriptionPlanId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export type GetSubscriptionPlanParams = z.infer<typeof GetSubscriptionPlanParamsSchema>

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
