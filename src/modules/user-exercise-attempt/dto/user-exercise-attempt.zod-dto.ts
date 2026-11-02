import { createZodDto } from 'nestjs-zod'
import {
  CreateUserExerciseAttemptBodySchema,
  UpdateUserExerciseAttemptBodySchema,
  GetUserExerciseAttemptByIdParamsSchema,
  CreateUserExerciseAttemptParamsSchema,
  GetUserExerciseAttemptListQuerySchema,
  UserExerciseAttemptResSchema,
  UserExerciseAttemptListResSchema,
  LatestExerciseAttemptsByLessonResSchema,
  CheckExerciseCompletionBodySchema
} from '../entities/user-exercise-attempt.entities'

export class CreateUserExerciseAttemptBodyDTO extends createZodDto(
  CreateUserExerciseAttemptBodySchema
) {}
export class UpdateUserExerciseAttemptBodyDTO extends createZodDto(
  UpdateUserExerciseAttemptBodySchema
) {}
export class GetUserExerciseAttemptByIdParamsDTO extends createZodDto(
  GetUserExerciseAttemptByIdParamsSchema
) {}
export class CreateUserExerciseAttemptParamsDTO extends createZodDto(
  CreateUserExerciseAttemptParamsSchema
) {}
export class GetUserExerciseAttemptListQueryDTO extends createZodDto(
  GetUserExerciseAttemptListQuerySchema
) {}
export class UserExerciseAttemptResDTO extends createZodDto(
  UserExerciseAttemptResSchema
) {}
export class UserExerciseAttemptListResDTO extends createZodDto(
  UserExerciseAttemptListResSchema
) {}
export class LatestExerciseAttemptsByLessonResDTO extends createZodDto(
  LatestExerciseAttemptsByLessonResSchema
) {}
export class CheckExerciseCompletionBodyDTO extends createZodDto(
  CheckExerciseCompletionBodySchema
) {}
