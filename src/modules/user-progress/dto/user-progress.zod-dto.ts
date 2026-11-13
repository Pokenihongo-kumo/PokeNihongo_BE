import { createZodDto } from 'nestjs-zod'
import {
  CreateUserProgressBodySchema,
  UpdateUserProgressBodySchema,
  GetUserProgressByIdParamsSchema,
  UserProgressLessonParamsSchema,
  UserProgressUserParamsSchema,
  GetUserProgressListQuerySchema,
  UserProgressResSchema,
  UserProgressListResSchema,
  StartLessonBodySchema,
  CompleteLessonBodySchema
} from '../entities/user-progress.entity'

export class CreateUserProgressBodyDTO extends createZodDto(
  CreateUserProgressBodySchema
) {}
export class UpdateUserProgressBodyDTO extends createZodDto(
  UpdateUserProgressBodySchema
) {}
export class GetUserProgressByIdParamsDTO extends createZodDto(
  GetUserProgressByIdParamsSchema
) {}
export class GetUserProgressListQueryDTO extends createZodDto(
  GetUserProgressListQuerySchema
) {}
export class UserProgressResDTO extends createZodDto(UserProgressResSchema) {}
export class UserProgressListResDTO extends createZodDto(UserProgressListResSchema) {}
export class StartLessonBodyDTO extends createZodDto(StartLessonBodySchema) {}
export class CompleteLessonBodyDTO extends createZodDto(CompleteLessonBodySchema) {}
export class UserProgressLessonParamsDTO extends createZodDto(
  UserProgressLessonParamsSchema
) {}
export class UserProgressUserParamsDTO extends createZodDto(
  UserProgressUserParamsSchema
) {}
