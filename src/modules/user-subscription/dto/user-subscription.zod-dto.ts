import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GetUserSubscriptionDetailSchema,
  UserSubscriptionSchema
} from '../entities/user-subscription.entity'

// Create Schema

export const CreateUserSubscriptionBodySchema = UserSubscriptionSchema.pick({
  subscriptionPlanId: true,
  invoiceId: true
})

  .strict()

export type CreateUserSubscriptionBody = z.infer<typeof CreateUserSubscriptionBodySchema>

export const CreateUserSubscriptionResSchema = resSchema(UserSubscriptionSchema)

// Update Schema

export const UpdateUserSubscriptionBodySchema = UserSubscriptionSchema.pick({
  startDate: true,
  expiresAt: true,
  status: true
})
  .partial()
  .strict()

export type UpdateUserSubscriptionBody = z.infer<typeof UpdateUserSubscriptionBodySchema>

export const UpdateUserSubscriptionResSchema = CreateUserSubscriptionResSchema

// Query Schema

export const GetUserSubscriptionParamsSchema = z.object({
  userSubscriptionId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export type GetUserSubscriptionParams = z.infer<typeof GetUserSubscriptionParamsSchema>

export const GetRewardByLeaderboardParamsSchema = z.object({
  leaderboardSeasonId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetUserSubscriptionDetailResSchema = resSchema(
  GetUserSubscriptionDetailSchema
)
