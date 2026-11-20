import { createZodDto } from 'nestjs-zod'
import {
  GetSubscriptionFeatureDetailResSchema,
  GetSubscriptionFeatureParamsSchema,
  UpdateWithListItemBodySchema,
  UpdateWithListItemResSchema
} from './subscription-feature.zod-dto'

export class UpdateWithListItemBodyDTO extends createZodDto(
  UpdateWithListItemBodySchema
) {}

export class GetSubscriptionFeatureParamsDTO extends createZodDto(
  GetSubscriptionFeatureParamsSchema
) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetSubscriptionFeatureDetailResDTO extends createZodDto(
  GetSubscriptionFeatureDetailResSchema
) {}
