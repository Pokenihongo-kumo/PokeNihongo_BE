import { z } from 'zod'

// ProgressStatus enum
export const ProgressStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'TESTING_LAST',
  'COMPLETED',
  'FAILED',
  'TESTING_LAST_FAILED'
])

// Lesson schema for UserProgress
export const LessonInfoSchema = z.object({
  id: z.number(),
  titleJp: z.string(),
  levelJlpt: z.number(),
  isPublished: z.boolean()
})

// UserProgress schema
export const UserProgressSchema = z.object({
  id: z.number(),
  userId: z.number(),
  lessonId: z.number(),
  status: ProgressStatusSchema,
  progressPercentage: z.number().min(0).max(100),
  completedAt: z.date().nullable(),
  lastAccessedAt: z.date(),
  testId: z.number().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lesson: LessonInfoSchema.optional()
})

// Create UserProgress schema
export const CreateUserProgressBodySchema = z
  .object({
    userId: z.number(),
    lessonId: z.number(),
    status: ProgressStatusSchema.optional().default('NOT_STARTED'),
    progressPercentage: z.number().min(0).max(100).optional().default(0)
  })
  .strict()

// Update UserProgress schema
export const UpdateUserProgressBodySchema = z
  .object({
    status: ProgressStatusSchema.optional(),
    progressPercentage: z.number().min(0).max(100).optional()
  })
  .strict()

// UserProgress with relations schema
export const UserProgressWithRelationsSchema = UserProgressSchema.extend({
  lesson: LessonInfoSchema.optional()
})

// Response schemas
export const UserProgressResSchema = z
  .object({
    data: UserProgressWithRelationsSchema,
    message: z.string()
  })
  .strict()

export const UserProgressListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(UserProgressWithRelationsSchema),
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

// Params and Query schemas
export const GetUserProgressByIdParamsSchema = z
  .object({
    id: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

export const GetUserProgressListQuerySchema = z
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
    lessonId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    lessonCategoryId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    status: ProgressStatusSchema.optional(),
    progressPercentage: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
  })
  .strict()

// Start lesson schema
export const StartLessonBodySchema = z
  .object({
    lessonId: z.number()
  })
  .strict()

// Complete lesson schema
export const CompleteLessonBodySchema = z
  .object({
    lessonId: z.number(),
    score: z.number().optional()
  })
  .strict()

// Types
export type ProgressStatusType = z.infer<typeof ProgressStatusSchema>
export type UserProgressType = z.infer<typeof UserProgressSchema>
export type CreateUserProgressBodyType = z.infer<typeof CreateUserProgressBodySchema>
export type UpdateUserProgressBodyType = z.infer<typeof UpdateUserProgressBodySchema>
export type UserProgressWithRelationsType = z.infer<
  typeof UserProgressWithRelationsSchema
>
export type UserProgressResType = z.infer<typeof UserProgressResSchema>
export type UserProgressListResType = z.infer<typeof UserProgressListResSchema>
export type GetUserProgressByIdParamsType = z.infer<
  typeof GetUserProgressByIdParamsSchema
>
export type GetUserProgressListQueryType = z.infer<typeof GetUserProgressListQuerySchema>
export type StartLessonBodyType = z.infer<typeof StartLessonBodySchema>
export type CompleteLessonBodyType = z.infer<typeof CompleteLessonBodySchema>
