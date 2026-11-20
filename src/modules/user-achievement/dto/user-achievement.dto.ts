import { createZodDto } from 'nestjs-zod'
import {
  CreateUserAchievementBodySchema,
  CreateUserAchievementResSchema,
  GetUserAchievementDetailResSchema,
  GetUserAchievementListForUserQuerySchema,
  GetUserAchievementParamsSchema,
  UpdateUserAchievementBodySchema,
  UpdateUserAchievementResSchema
} from './user-achievement.zod-dto'

// Request DTOs
export class CreateUserAchievementBodyDTO extends createZodDto(
  CreateUserAchievementBodySchema
) {}

export class UpdateUserAchievementBodyDTO extends createZodDto(
  UpdateUserAchievementBodySchema
) {}

export class GetUserAchievementParamsDTO extends createZodDto(
  GetUserAchievementParamsSchema
) {}

// Response DTOs
export class CreateUserAchievementResDTO extends createZodDto(
  CreateUserAchievementResSchema
) {}
export class UpdateUserAchievementResDTO extends createZodDto(
  UpdateUserAchievementResSchema
) {}
export class GetUserAchievementDetailResDTO extends createZodDto(
  GetUserAchievementDetailResSchema
) {}

export class GetUserAchievementListForUserQueryDTO extends createZodDto(
  GetUserAchievementListForUserQuerySchema
) {}
