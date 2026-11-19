import { createZodDto } from 'nestjs-zod'
import {
  CreateUserSubscriptionBodySchema,
  CreateUserSubscriptionResSchema,
  GetRewardByLeaderboardParamsSchema,
  GetUserSubscriptionDetailResSchema,
  GetUserSubscriptionParamsSchema,
  UpdateUserSubscriptionBodySchema,
  UpdateUserSubscriptionResSchema
} from './user-subscription.zod-dto'

// Request DTOs
export class CreateUserSubscriptionBodyDTO extends createZodDto(
  CreateUserSubscriptionBodySchema
) {}

export class UpdateUserSubscriptionBodyDTO extends createZodDto(
  UpdateUserSubscriptionBodySchema
) {}

export class GetUserSubscriptionParamsDTO extends createZodDto(
  GetUserSubscriptionParamsSchema
) {}

export class GetRewardByLeaderboardParamsDTO extends createZodDto(
  GetRewardByLeaderboardParamsSchema
) {}

// Response DTOs
export class CreateUserSubscriptionResDTO extends createZodDto(
  CreateUserSubscriptionResSchema
) {}
export class UpdateUserSubscriptionResDTO extends createZodDto(
  UpdateUserSubscriptionResSchema
) {}
export class GetUserSubscriptionDetailResDTO extends createZodDto(
  GetUserSubscriptionDetailResSchema
) {}
