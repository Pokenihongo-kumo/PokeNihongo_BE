import { createZodDto } from 'nestjs-zod'
import {
  CreateSubscriptionPlanBodySchema,
  CreateSubscriptionPlanResSchema,
  GetDiscountBySubPlanResSchema,
  GetSubscriptionPlanDetailResSchema,
  GetSubscriptionPlanParamsSchema,
  UpdateSubscriptionPlanBodySchema,
  UpdateSubscriptionPlanResSchema,
  UpdateWithListItemResSchema
} from './subscription-plan.zod-dto'

// Request DTOs
export class CreateSubscriptionPlanBodyDTO extends createZodDto(
  CreateSubscriptionPlanBodySchema
) {}

export class UpdateSubscriptionPlanBodyDTO extends createZodDto(
  UpdateSubscriptionPlanBodySchema
) {}

export class GetSubscriptionPlanParamsDTO extends createZodDto(
  GetSubscriptionPlanParamsSchema
) {}

// Response DTOs
export class CreateSubscriptionPlanResDTO extends createZodDto(
  CreateSubscriptionPlanResSchema
) {}
export class UpdateSubscriptionPlanResDTO extends createZodDto(
  UpdateSubscriptionPlanResSchema
) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetSubscriptionPlanDetailResDTO extends createZodDto(
  GetSubscriptionPlanDetailResSchema
) {}

export class GetDiscountBySubPlanResDTO extends createZodDto(
  GetDiscountBySubPlanResSchema
) {}
