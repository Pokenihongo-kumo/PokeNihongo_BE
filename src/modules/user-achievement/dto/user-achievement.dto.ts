import { createZodDto } from 'nestjs-zod'
import {
  GetUserAchievementListForUserQuerySchema,
  CreateUserAchievementBodySchema,
  CreateUserAchievementResSchema,
  GetUserAchievementDetailResSchema,
  GetUserAchievementParamsSchema,
  UpdateUserAchievementBodySchema,
  UpdateUserAchievementResSchema,
  UpdateWithListItemResSchema
} from '../entities/user-achievement.entity'

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
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetUserAchievementDetailResDTO extends createZodDto(
  GetUserAchievementDetailResSchema
) {}

export class GetUserAchievementListForUserQueryDTO extends createZodDto(
  GetUserAchievementListForUserQuerySchema
) {}
