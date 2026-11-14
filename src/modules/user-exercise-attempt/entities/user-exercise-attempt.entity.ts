import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { LessonContentsType } from '@prisma/client'
import { UserExerciseAttemptMessage as M } from '@/i18n/message-keys'
import { checkIdSchema } from '@/common/utils/id.validation'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// ExerciseAttemptStatus enum
export const ExerciseAttemptStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'ABANDONED',
  'SKIPPED'
])

// UserExerciseAttempt schema
export const UserExerciseAttemptSchema = z.object({
  id: z.number(),
  userId: z.number(),
  exerciseId: z.number(),
  status: ExerciseAttemptStatusSchema,
  time: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateUserExerciseAttemptBodySchema = z.object({}).strict()

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

export const UserExerciseAttemptResSchema = z
  .object({
    statusCode: z.number(),
    data: UserExerciseAttemptSchema,
    message: z.string()
  })
  .strict()

export const UserExerciseAttemptListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(UserExerciseAttemptSchema),
      pagination: z.object({
        current: z.number(),
        pageSize: z.number(),
        totalPage: z.number(),
        totalItem: z.number()
      })
    }),
    message: z.string()
  })
  .strict()

export const GetUserExerciseAttemptByIdParamsSchema = z
  .object({ id: checkIdSchema(M.INVALID_ID) })
  .strict()

export const CreateUserExerciseAttemptParamsSchema = z
  .object({ exerciseId: checkIdSchema(M.INVALID_EXERCISE_ID) })
  .strict()

export const UserExerciseAttemptLessonParamsSchema = z
  .object({ lessonId: checkIdSchema(M.INVALID_LESSON_ID) })
  .strict()

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

export const LatestExerciseAttemptSchema = z.object({
  id: z.number(),
  userId: z.number(),
  exerciseId: z.number(),
  exerciseType: z.nativeEnum(LessonContentsType),
  status: ExerciseAttemptStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date()
})

export const LatestExerciseAttemptsByLessonResSchema = z
  .object({
    statusCode: z.number(),
    data: z.array(LatestExerciseAttemptSchema),
    message: z.string()
  })
  .strict()

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

// Types
export type ExerciseAttemptStatusType = z.infer<typeof ExerciseAttemptStatusSchema>
export type UserExerciseAttemptType = z.infer<typeof UserExerciseAttemptSchema>
export type CreateUserExerciseAttemptBodyType = z.infer<
  typeof CreateUserExerciseAttemptBodySchema
>
export type UpdateUserExerciseAttemptBodyType = z.infer<
  typeof UpdateUserExerciseAttemptBodySchema
>
export type UserExerciseAttemptResType = z.infer<typeof UserExerciseAttemptResSchema>
export type UserExerciseAttemptListResType = z.infer<
  typeof UserExerciseAttemptListResSchema
>
export type GetUserExerciseAttemptByIdParamsType = z.infer<
  typeof GetUserExerciseAttemptByIdParamsSchema
>
export type CreateUserExerciseAttemptParamsType = z.infer<
  typeof CreateUserExerciseAttemptParamsSchema
>
export type GetUserExerciseAttemptListQueryType = z.infer<
  typeof GetUserExerciseAttemptListQuerySchema
>
export type LatestExerciseAttemptType = z.infer<typeof LatestExerciseAttemptSchema>
export type LatestExerciseAttemptsByLessonResType = z.infer<
  typeof LatestExerciseAttemptsByLessonResSchema
>
export type CheckExerciseCompletionBodyType = z.infer<
  typeof CheckExerciseCompletionBodySchema
>
