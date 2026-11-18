import { FeatureKey } from '@/common/constants/subscription.constant'
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

export type Feature = z.infer<typeof FeatureSchema>
type FeatureFieldType = keyof z.infer<typeof FeatureSchema>
export const LEADERBOARD_SEASON_FIELDS = [
  ...Object.keys(FeatureSchema.shape),
  'nameTranslation',
  'descriptionTranslation'
] as FeatureFieldType[]
