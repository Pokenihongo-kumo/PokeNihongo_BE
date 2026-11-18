import { UserSubscriptionStatus } from '@/common/constants/subscription.constant'
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

export const GetUserSubscriptionDetailSchema = UserSubscriptionSchema

// Type exports
export type UserSubscription = z.infer<typeof UserSubscriptionSchema>
// Field for query
export type UserSubscriptionFieldType = keyof z.infer<typeof UserSubscriptionSchema>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  UserSubscriptionSchema.shape
) as UserSubscriptionFieldType[]
