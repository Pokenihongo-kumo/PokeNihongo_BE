import { createZodDto } from 'nestjs-zod'
import {
  CreateSubscriptionFeatureBodySchema,
  CreateSubscriptionFeatureResSchema,
  GetSubscriptionFeatureDetailResSchema,
  GetSubscriptionFeatureParamsSchema,
  UpdateSubscriptionFeatureBodySchema,
  UpdateSubscriptionFeatureResSchema,
  UpdateWithListItemBodySchema,
  UpdateWithListItemResSchema
} from './subscription-feature.zod-dto'

// Request DTOs
export class CreateSubscriptionFeatureBodyDTO extends createZodDto(
  CreateSubscriptionFeatureBodySchema
) {}

export class UpdateSubscriptionFeatureBodyDTO extends createZodDto(
  UpdateSubscriptionFeatureBodySchema
) {}

export class UpdateWithListItemBodyDTO extends createZodDto(
  UpdateWithListItemBodySchema
) {}

export class GetSubscriptionFeatureParamsDTO extends createZodDto(
  GetSubscriptionFeatureParamsSchema
) {}

// Response DTOs
export class CreateSubscriptionFeatureResDTO extends createZodDto(
  CreateSubscriptionFeatureResSchema
) {}
export class UpdateSubscriptionFeatureResDTO extends createZodDto(
  UpdateSubscriptionFeatureResSchema
) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetSubscriptionFeatureDetailResDTO extends createZodDto(
  GetSubscriptionFeatureDetailResSchema
) {}
