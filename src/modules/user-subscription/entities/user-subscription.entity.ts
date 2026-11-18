import { UserSubscriptionStatus } from '@/common/constants/subscription.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base UserSubscription Schema
export const UserSubscriptionSchema = z.object({
  id: z.number(),
  userId: z.number(),
  subscriptionPlanId: z.number(),
  invoiceId: z.number(),
  startDate: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
  status: z
    .enum([
      UserSubscriptionStatus.PENDING_PAYMENT,
      UserSubscriptionStatus.ACTIVE,
      UserSubscriptionStatus.CANCELED,
      UserSubscriptionStatus.PAYMENT_FAILED
    ])
    .default(UserSubscriptionStatus.PENDING_PAYMENT),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateUserSubscriptionBodySchema = UserSubscriptionSchema.pick({
  subscriptionPlanId: true,
  invoiceId: true
})

  .strict()

export const CreateUserSubscriptionResSchema = resSchema(UserSubscriptionSchema)

// Update Schema
export const UpdateUserSubscriptionBodySchema = UserSubscriptionSchema.pick({
  startDate: true,
  expiresAt: true,
  status: true
})
  .partial()
  .strict()

export const UpdateUserSubscriptionResSchema = CreateUserSubscriptionResSchema

// Query Schema
export const GetUserSubscriptionParamsSchema = z.object({
  userSubscriptionId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetRewardByLeaderboardParamsSchema = z.object({
  leaderboardSeasonId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetUserSubscriptionDetailSchema = UserSubscriptionSchema

export const GetUserSubscriptionDetailResSchema = resSchema(
  GetUserSubscriptionDetailSchema
)

// Type exports
export type UserSubscription = z.infer<typeof UserSubscriptionSchema>
export type CreateUserSubscriptionBody = z.infer<typeof CreateUserSubscriptionBodySchema>
export type UpdateUserSubscriptionBody = z.infer<typeof UpdateUserSubscriptionBodySchema>
export type GetUserSubscriptionParams = z.infer<typeof GetUserSubscriptionParamsSchema>

// Field for query
export type UserSubscriptionFieldType = keyof z.infer<typeof UserSubscriptionSchema>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  UserSubscriptionSchema.shape
) as UserSubscriptionFieldType[]
