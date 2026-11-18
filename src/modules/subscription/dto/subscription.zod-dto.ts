import { TagNameSubscription } from '@/common/constants/subscription.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { SubscriptionMessage } from '@/i18n/message-keys'
import { InvoiceSchema } from '@/modules/invoice/entities/invoice.entity'
import { SubscriptionFeatureSchema } from '@/modules/subscription-feature/entities/subscription-feature.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  GetLeaderboardWithRewardSeasonDetailSchema,
  SubscriptionSchema
} from '../entities/subscription.entity'

export const CreateSubscriptionBodyInputSchema = SubscriptionSchema.pick({
  tagName: true
})
  .strict()
  .extend({
    nameTranslations: TranslationInputSchema,
    descriptionTranslations: TranslationInputSchema
  })

export type CreateSubscriptionBodyInput = z.infer<
  typeof CreateSubscriptionBodyInputSchema
>

export class CreatedSubscriptionBodyInputDTO extends createZodDto(
  CreateSubscriptionBodyInputSchema
) {}

export const CreateSubscriptionBodySchema = SubscriptionSchema.pick({
  nameKey: true,
  descriptionKey: true,
  tagName: true
}).strict()

export type CreateSubscriptionBody = z.infer<typeof CreateSubscriptionBodySchema>

export const CreateSubscriptionResSchema = resSchema(SubscriptionSchema)

export class CreateSubscriptionResDTO extends createZodDto(CreateSubscriptionResSchema) {}

export const UpdateSubscriptionBodyInputSchema =
  CreateSubscriptionBodyInputSchema.partial().strict()

export type UpdateSubscriptionBodyInput = z.infer<
  typeof UpdateSubscriptionBodyInputSchema
>

export class UpdateSubscriptionBodyInputDTO extends createZodDto(
  UpdateSubscriptionBodyInputSchema
) {}

export const UpdateSubscriptionBodySchema =
  CreateSubscriptionBodySchema.partial().strict()

export type UpdateSubscriptionBody = z.infer<typeof UpdateSubscriptionBodySchema>

export const UpdateSubscriptionResSchema = CreateSubscriptionResSchema

export class UpdateSubscriptionResDTO extends createZodDto(UpdateSubscriptionResSchema) {}

export const GetSubscriptionParamsSchema = z
  .object({
    subscriptionId: checkIdSchema(SubscriptionMessage.INVALID_DATA)
  })
  .strict()

export type GetSubscriptionParams = z.infer<typeof GetSubscriptionParamsSchema>

export class GetSubscriptionParamsDTO extends createZodDto(GetSubscriptionParamsSchema) {}

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

export class GetSubscriptionDetailWithAllLangResDTO extends createZodDto(
  GetSubscriptionDetailWithAllLangResSchema
) {}

export const GetLeaderboardWithRewardSeasonDetailResSchema = resSchema(
  GetLeaderboardWithRewardSeasonDetailSchema
)

export class GetLeaderboardWithRewardSeasonDetailResDTO extends createZodDto(
  GetLeaderboardWithRewardSeasonDetailResSchema
) {}

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

export type GetSubscriptionDetailRes = z.infer<typeof GetSubscriptionDetailResSchema>

export class GetSubscriptionDetailResDTO extends createZodDto(
  GetSubscriptionDetailResSchema
) {}

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

export class GetMarketplaceListResDTO extends createZodDto(GetMarketplaceListResSchema) {}

export const GetMarketplaceOptionsResSchema = resSchema(
  MarketplaceSubscriptionOptionsSchema
)

export class GetMarketplaceOptionsResDTO extends createZodDto(
  GetMarketplaceOptionsResSchema
) {}
