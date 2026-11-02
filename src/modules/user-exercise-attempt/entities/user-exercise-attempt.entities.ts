import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { LessonContentsType } from '@prisma/client'

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

export const UpdateUserExerciseAttemptBodySchema = UserExerciseAttemptSchema.pick({
  status: true
})
  .partial()
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
  .object({
    id: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

export const CreateUserExerciseAttemptParamsSchema = z
  .object({
    exerciseId: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

export const GetUserExerciseAttemptListQuerySchema = z
  .object({
    currentPage: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('1'),
    pageSize: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('10'),
    userId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    exerciseId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    status: ExerciseAttemptStatusSchema.optional()
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

// Check completion body (time in seconds, optional)
export const CheckExerciseCompletionBodySchema = z
  .object({
    time: z.number().int().nonnegative().optional()
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
