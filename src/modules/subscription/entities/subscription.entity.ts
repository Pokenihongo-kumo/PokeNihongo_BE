import { TagNameSubscription } from '@/common/constants/subscription.constant'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const SubscriptionSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  descriptionKey: z.string(),
  tagName: z
    .enum([
      TagNameSubscription.COMBO,
      TagNameSubscription.NORMAL,
      TagNameSubscription.ULTRA
    ])
    .default(TagNameSubscription.NORMAL),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const GetLeaderboardWithRewardSeasonDetailSchema = SubscriptionSchema.pick({
  id: true,
  tagName: true
}).extend({
  nameTranslation: z.string().nullable().optional(),
  nameTranslations: TranslationInputSchema.nullable().optional(),
  descriptionTranslation: z.string().nullable().optional(),
  descriptionTranslations: TranslationInputSchema.nullable().optional()
})

export type Subscription = z.infer<typeof SubscriptionSchema>
type SubscriptionFieldType = keyof z.infer<typeof SubscriptionSchema>
export const LEADERBOARD_SEASON_FIELDS = [
  ...Object.keys(SubscriptionSchema.shape),
  'nameTranslation',
  'descriptionTranslation'
] as SubscriptionFieldType[]
