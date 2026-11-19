import { createZodDto } from 'nestjs-zod'
import {
  CreateNotificationBodySchema,
  CreateNotificationResSchema,
  GetNotificationDetailResSchema,
  GetNotificationParamsSchema,
  GetRewardByLeaderboardParamsSchema,
  UpdateNotificationBodySchema,
  UpdateNotificationReadListBodySchema,
  UpdateNotificationReadListResSchema,
  UpdateNotificationResSchema
} from './notification.zod-dto'

// Request DTOs
export class CreateNotificationBodyDTO extends createZodDto(
  CreateNotificationBodySchema
) {}

export class UpdateNotificationBodyDTO extends createZodDto(
  UpdateNotificationBodySchema
) {}

export class UpdateNotificationReadListResDTO extends createZodDto(
  UpdateNotificationReadListResSchema
) {}

export class GetNotificationParamsDTO extends createZodDto(GetNotificationParamsSchema) {}

export class GetRewardByLeaderboardParamsDTO extends createZodDto(
  GetRewardByLeaderboardParamsSchema
) {}

// Response DTOs
export class CreateNotificationResDTO extends createZodDto(CreateNotificationResSchema) {}
export class UpdateNotificationResDTO extends createZodDto(UpdateNotificationResSchema) {}

export class UpdateNotificationReadListBodyDTO extends createZodDto(
  UpdateNotificationReadListBodySchema
) {}
export class GetNotificationDetailResDTO extends createZodDto(
  GetNotificationDetailResSchema
) {}
