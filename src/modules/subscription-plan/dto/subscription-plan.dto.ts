import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateSubscriptionPlanBodySchema,
  CreateSubscriptionPlanResSchema,
  GetDiscountBySubPlanResSchema,
  GetSubscriptionPlanDetailResSchema,
  GetSubscriptionPlanParamsSchema,
  UpdateSubscriptionPlanBodySchema,
  UpdateSubscriptionPlanResSchema
} from './subscription-plan.zod-dto'

// Request DTOs

export type CreateSubscriptionPlanBody = z.infer<typeof CreateSubscriptionPlanBodySchema>

export class CreateSubscriptionPlanBodyDTO extends createZodDto(
  CreateSubscriptionPlanBodySchema
) {}

export type UpdateSubscriptionPlanBody = z.infer<typeof UpdateSubscriptionPlanBodySchema>

export class UpdateSubscriptionPlanBodyDTO extends createZodDto(
  UpdateSubscriptionPlanBodySchema
) {}

export type GetSubscriptionPlanParams = z.infer<typeof GetSubscriptionPlanParamsSchema>

export class GetSubscriptionPlanParamsDTO extends createZodDto(
  GetSubscriptionPlanParamsSchema
) {}

// Response DTOs

export type CreateSubscriptionPlanRes = z.infer<typeof CreateSubscriptionPlanResSchema>

export class CreateSubscriptionPlanResDTO extends createZodDto(
  CreateSubscriptionPlanResSchema
) {}

export type UpdateSubscriptionPlanRes = z.infer<typeof UpdateSubscriptionPlanResSchema>

export class UpdateSubscriptionPlanResDTO extends createZodDto(
  UpdateSubscriptionPlanResSchema
) {}
export type GetSubscriptionPlanDetailRes = z.infer<
  typeof GetSubscriptionPlanDetailResSchema
>

export class GetSubscriptionPlanDetailResDTO extends createZodDto(
  GetSubscriptionPlanDetailResSchema
) {}

export type GetDiscountBySubPlanRes = z.infer<typeof GetDiscountBySubPlanResSchema>

export class GetDiscountBySubPlanResDTO extends createZodDto(
  GetDiscountBySubPlanResSchema
) {}
