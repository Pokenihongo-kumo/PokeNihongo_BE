import { z } from 'zod'
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

export type CreateUserAchievementBody = z.infer<typeof CreateUserAchievementBodySchema>

export class CreateUserAchievementBodyDTO extends createZodDto(
  CreateUserAchievementBodySchema
) {}

export type UpdateUserAchievementBody = z.infer<typeof UpdateUserAchievementBodySchema>

export class UpdateUserAchievementBodyDTO extends createZodDto(
  UpdateUserAchievementBodySchema
) {}

export type GetUserAchievementParams = z.infer<typeof GetUserAchievementParamsSchema>

export class GetUserAchievementParamsDTO extends createZodDto(
  GetUserAchievementParamsSchema
) {}

// Response DTOs

export type CreateUserAchievementRes = z.infer<typeof CreateUserAchievementResSchema>

export class CreateUserAchievementResDTO extends createZodDto(
  CreateUserAchievementResSchema
) {}

export type UpdateUserAchievementRes = z.infer<typeof UpdateUserAchievementResSchema>

export class UpdateUserAchievementResDTO extends createZodDto(
  UpdateUserAchievementResSchema
) {}
export type GetUserAchievementDetailRes = z.infer<
  typeof GetUserAchievementDetailResSchema
>

export class GetUserAchievementDetailResDTO extends createZodDto(
  GetUserAchievementDetailResSchema
) {}

export type GetUserAchievementListForUserQuery = z.infer<
  typeof GetUserAchievementListForUserQuerySchema
>

export class GetUserAchievementListForUserQueryDTO extends createZodDto(
  GetUserAchievementListForUserQuerySchema
) {}
