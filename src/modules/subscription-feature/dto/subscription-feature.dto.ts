import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  GetSubscriptionFeatureDetailResSchema,
  GetSubscriptionFeatureParamsSchema,
  UpdateWithListItemBodySchema,
  UpdateWithListItemResSchema
} from './subscription-feature.zod-dto'

export type UpdateWithListItemBody = z.infer<typeof UpdateWithListItemBodySchema>

export class UpdateWithListItemBodyDTO extends createZodDto(
  UpdateWithListItemBodySchema
) {}

export type GetSubscriptionFeatureParams = z.infer<
  typeof GetSubscriptionFeatureParamsSchema
>

export class GetSubscriptionFeatureParamsDTO extends createZodDto(
  GetSubscriptionFeatureParamsSchema
) {}

export type UpdateWithListItemRes = z.infer<typeof UpdateWithListItemResSchema>

export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export type GetSubscriptionFeatureDetailRes = z.infer<
  typeof GetSubscriptionFeatureDetailResSchema
>

export class GetSubscriptionFeatureDetailResDTO extends createZodDto(
  GetSubscriptionFeatureDetailResSchema
) {}
