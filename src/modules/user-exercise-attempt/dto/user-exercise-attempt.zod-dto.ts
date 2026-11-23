import { checkIdSchema } from '@/common/utils/id.validation'
import { UserExerciseAttemptMessage as M } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  ExerciseAttemptStatusSchema,
  LatestExerciseAttemptSchema,
  UserExerciseAttemptSchema
} from '../entities/user-exercise-attempt.entity'

export const CreateUserExerciseAttemptBodySchema = z.object({}).strict()

export type CreateUserExerciseAttemptBody = z.infer<
  typeof CreateUserExerciseAttemptBodySchema
>

export class CreateUserExerciseAttemptBodyDTO extends createZodDto(
  CreateUserExerciseAttemptBodySchema
) {}

// The app continues (IN_PROGRESS) or skips an attempt. COMPLETED/FAILED come
// only from submit-completion, which grades the answers

export const UpdateUserExerciseAttemptBodySchema = z
  .object({
    status: z
      .enum(['IN_PROGRESS', 'SKIPPED', 'ABANDONED'], {
        errorMap: () => ({ message: M.INVALID_STATUS })
      })
      .optional()
  })
  .strict()

export type UpdateUserExerciseAttemptBody = z.infer<
  typeof UpdateUserExerciseAttemptBodySchema
>

export class UpdateUserExerciseAttemptBodyDTO extends createZodDto(
  UpdateUserExerciseAttemptBodySchema
) {}

export const UserExerciseAttemptResSchema = resSchema(UserExerciseAttemptSchema).strict()

export type UserExerciseAttemptRes = z.infer<typeof UserExerciseAttemptResSchema>

export class UserExerciseAttemptResDTO extends createZodDto(
  UserExerciseAttemptResSchema
) {}

export const UserExerciseAttemptListResSchema = paginatedResSchema(
  UserExerciseAttemptSchema
).strict()

export type UserExerciseAttemptListRes = z.infer<typeof UserExerciseAttemptListResSchema>

export class UserExerciseAttemptListResDTO extends createZodDto(
  UserExerciseAttemptListResSchema
) {}

export const GetUserExerciseAttemptByIdParamsSchema = z
  .object({ id: checkIdSchema(M.INVALID_ID) })
  .strict()

export type GetUserExerciseAttemptByIdParams = z.infer<
  typeof GetUserExerciseAttemptByIdParamsSchema
>

export class GetUserExerciseAttemptByIdParamsDTO extends createZodDto(
  GetUserExerciseAttemptByIdParamsSchema
) {}

export const CreateUserExerciseAttemptParamsSchema = z
  .object({ exerciseId: checkIdSchema(M.INVALID_EXERCISE_ID) })
  .strict()

export type CreateUserExerciseAttemptParams = z.infer<
  typeof CreateUserExerciseAttemptParamsSchema
>

export class CreateUserExerciseAttemptParamsDTO extends createZodDto(
  CreateUserExerciseAttemptParamsSchema
) {}

export const UserExerciseAttemptLessonParamsSchema = z
  .object({ lessonId: checkIdSchema(M.INVALID_LESSON_ID) })
  .strict()

export type UserExerciseAttemptLessonParams = z.infer<
  typeof UserExerciseAttemptLessonParamsSchema
>

export class UserExerciseAttemptLessonParamsDTO extends createZodDto(
  UserExerciseAttemptLessonParamsSchema
) {}

export const GetUserExerciseAttemptListQuerySchema = z
  .object({
    currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).default(10),
    userId: checkIdSchema(M.INVALID_USER_ID).optional(),
    exerciseId: checkIdSchema(M.INVALID_EXERCISE_ID).optional(),
    status: z
      .enum(ExerciseAttemptStatusSchema.options, {
        errorMap: () => ({ message: M.INVALID_STATUS })
      })
      .optional()
  })
  .strict()

export type GetUserExerciseAttemptListQuery = z.infer<
  typeof GetUserExerciseAttemptListQuerySchema
>

export class GetUserExerciseAttemptListQueryDTO extends createZodDto(
  GetUserExerciseAttemptListQuerySchema
) {}

export const LatestExerciseAttemptsByLessonResSchema = resSchema(
  z.array(LatestExerciseAttemptSchema)
).strict()

export type LatestExerciseAttemptsByLessonRes = z.infer<
  typeof LatestExerciseAttemptsByLessonResSchema
>

export class LatestExerciseAttemptsByLessonResDTO extends createZodDto(
  LatestExerciseAttemptsByLessonResSchema
) {}

// Submit / abandon body: time spent in seconds, optional

export const CheckExerciseCompletionBodySchema = z
  .object({
    time: z
      .number({ invalid_type_error: M.INVALID_TIME })
      .int(M.INVALID_TIME)
      .nonnegative(M.INVALID_TIME)
      .optional()
  })
  .strict()

export type CheckExerciseCompletionBody = z.infer<
  typeof CheckExerciseCompletionBodySchema
>

export class CheckExerciseCompletionBodyDTO extends createZodDto(
  CheckExerciseCompletionBodySchema
) {}
