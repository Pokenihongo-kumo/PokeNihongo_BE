import { TagNameSubscription } from '@/common/constants/subscription.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { SubscriptionMessage } from '@/i18n/message-keys'
import { InvoiceSchema } from '@/modules/invoice/entities/invoice.entity'
import { SubscriptionFeatureSchema } from '@/modules/subscription-feature/entities/subscription-feature.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
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

export const CreateSubscriptionBodyInputSchema = SubscriptionSchema.pick({
  tagName: true
})
  .strict()
  .extend({
    nameTranslations: TranslationInputSchema,
    descriptionTranslations: TranslationInputSchema
  })

export const CreateSubscriptionBodySchema = SubscriptionSchema.pick({
  nameKey: true,
  descriptionKey: true,
  tagName: true
}).strict()

export const CreateSubscriptionResSchema = resSchema(SubscriptionSchema)

export const UpdateSubscriptionBodyInputSchema =
  CreateSubscriptionBodyInputSchema.partial().strict()

export const UpdateSubscriptionBodySchema =
  CreateSubscriptionBodySchema.partial().strict()

export const UpdateSubscriptionResSchema = CreateSubscriptionResSchema

export const GetSubscriptionParamsSchema = z
  .object({
    subscriptionId: checkIdSchema(SubscriptionMessage.INVALID_DATA)
  })
  .strict()

export const GetSubscriptionDetailWithAllLangResSchema = resSchema(
  SubscriptionSchema.extend({
    nameTranslations: z
      .array(
        z.object({
          key: z.string(),
          value: z.string()
        })
      )
      .optional(),
    descriptionTranslations: z
      .array(
        z.object({
          key: z.string(),
          value: z.string()
        })
      )
      .optional()
  })
)

export const GetLeaderboardWithRewardSeasonDetailSchema = SubscriptionSchema.pick({
  id: true,
  tagName: true
}).extend({
  nameTranslation: z.string().nullable().optional(),
  nameTranslations: TranslationInputSchema.nullable().optional(),
  descriptionTranslation: z.string().nullable().optional(),
  descriptionTranslations: TranslationInputSchema.nullable().optional()
})

export const GetLeaderboardWithRewardSeasonDetailResSchema = resSchema(
  GetLeaderboardWithRewardSeasonDetailSchema
)
export const GetSubscriptionDetailResSchema = resSchema(
  SubscriptionSchema.extend({
    nameTranslation: z.string().nullable().optional(),
    nameTranslations: TranslationInputSchema.nullable().optional(),
    descriptionTranslation: z.string().nullable().optional(),
    descriptionTranslations: TranslationInputSchema.nullable().optional(),
    features: z
      .array(
        SubscriptionFeatureSchema.pick({
          id: true,

          value: true
        })
      )
      .optional()
  })
)

export type Subscription = z.infer<typeof SubscriptionSchema>
export type CreateSubscriptionBodyInput = z.infer<
  typeof CreateSubscriptionBodyInputSchema
>
export type CreateSubscriptionBody = z.infer<typeof CreateSubscriptionBodySchema>
export type UpdateSubscriptionBodyInput = z.infer<
  typeof UpdateSubscriptionBodyInputSchema
>
export type UpdateSubscriptionBody = z.infer<typeof UpdateSubscriptionBodySchema>
export type GetSubscriptionParams = z.infer<typeof GetSubscriptionParamsSchema>
export type GetSubscriptionDetailRes = z.infer<typeof GetSubscriptionDetailResSchema>

type SubscriptionFieldType = keyof z.infer<typeof SubscriptionSchema>
export const LEADERBOARD_SEASON_FIELDS = [
  ...Object.keys(SubscriptionSchema.shape),
  'nameTranslation',
  'descriptionTranslation'
] as SubscriptionFieldType[]

// Marketplace Schemas
const MarketplaceFeatureSchema = z.object({
  id: z.number(),
  featureId: z.number(),
  value: z.string().nullable(),
  feature: z.object({
    id: z.number(),
    featureKey: z.string(),
    nameKey: z.string(),
    nameTranslation: z.string()
  })
})

const MarketplacePlanSchema = z.object({
  id: z.number(),
  subscriptionId: z.number(),
  price: z.number(),
  type: z.enum(['LIFETIME', 'RECURRING']),
  durationInDays: z.number().nullable(),
  isActive: z.boolean(),
  pendingInvoice: InvoiceSchema.pick({
    id: true,
    subtotalAmount: true,
    discountAmount: true,
    totalAmount: true,
    status: true
  }).optional()
})

const MarketplaceSubscriptionSchema = z.object({
  id: z.number(),
  tagName: z.enum([
    TagNameSubscription.COMBO,
    TagNameSubscription.NORMAL,
    TagNameSubscription.ULTRA
  ]),
  nameTranslation: z.string(),
  descriptionTranslation: z.string(),
  plans: z.array(MarketplacePlanSchema),
  features: z.array(MarketplaceFeatureSchema),
  isPopular: z.boolean(),
  canBuy: z.boolean()
})

const MarketplaceSubscriptionOptionsSchema = z.object({
  id: z.number(),
  tagName: z.enum([
    TagNameSubscription.COMBO,
    TagNameSubscription.NORMAL,
    TagNameSubscription.ULTRA
  ]),
  nameTranslation: z.string(),
  descriptionTranslation: z.string(),
  plans: z.array(MarketplacePlanSchema),
  features: z.array(MarketplaceFeatureSchema)
})

export const GetMarketplaceListResSchema = resSchema(
  z.array(MarketplaceSubscriptionSchema)
)

export const GetMarketplaceOptionsResSchema = resSchema(
  MarketplaceSubscriptionOptionsSchema
)
