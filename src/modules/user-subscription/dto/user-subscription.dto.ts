import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateUserSubscriptionBodySchema,
  CreateUserSubscriptionResSchema,
  GetUserSubscriptionDetailResSchema,
  GetUserSubscriptionParamsSchema,
  UpdateUserSubscriptionBodySchema,
  UpdateUserSubscriptionResSchema
} from './user-subscription.zod-dto'

// Request DTOs

export type CreateUserSubscriptionBody = z.infer<typeof CreateUserSubscriptionBodySchema>

export class CreateUserSubscriptionBodyDTO extends createZodDto(
  CreateUserSubscriptionBodySchema
) {}

export type UpdateUserSubscriptionBody = z.infer<typeof UpdateUserSubscriptionBodySchema>

export class UpdateUserSubscriptionBodyDTO extends createZodDto(
  UpdateUserSubscriptionBodySchema
) {}

export type GetUserSubscriptionParams = z.infer<typeof GetUserSubscriptionParamsSchema>

export class GetUserSubscriptionParamsDTO extends createZodDto(
  GetUserSubscriptionParamsSchema
) {}

// Response DTOs

export type CreateUserSubscriptionRes = z.infer<typeof CreateUserSubscriptionResSchema>

export class CreateUserSubscriptionResDTO extends createZodDto(
  CreateUserSubscriptionResSchema
) {}

export type UpdateUserSubscriptionRes = z.infer<typeof UpdateUserSubscriptionResSchema>

export class UpdateUserSubscriptionResDTO extends createZodDto(
  UpdateUserSubscriptionResSchema
) {}
export type GetUserSubscriptionDetailRes = z.infer<
  typeof GetUserSubscriptionDetailResSchema
>

export class GetUserSubscriptionDetailResDTO extends createZodDto(
  GetUserSubscriptionDetailResSchema
) {}
