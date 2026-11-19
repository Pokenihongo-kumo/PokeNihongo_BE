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

export const GetSubscriptionFeatureDetailSchema = SubscriptionFeatureSchema

// Type exports
export type SubscriptionFeature = z.infer<typeof SubscriptionFeatureSchema>
// Field for query
export type SubscriptionFeatureFieldType = keyof z.infer<typeof SubscriptionFeatureSchema>
export const USER_GACHA_PITY_FIELDS = Object.keys(
  SubscriptionFeatureSchema.shape
) as SubscriptionFeatureFieldType[]
