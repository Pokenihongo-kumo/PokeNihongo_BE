import { z } from 'zod'
import { UserProgressMessage } from '@/i18n/message-keys'
import { checkIdSchema } from '@/common/utils/id.validation'

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
    id: checkIdSchema(UserProgressMessage.INVALID_ID)
  })
  .strict()

export const UserProgressLessonParamsSchema = z
  .object({
    lessonId: checkIdSchema(UserProgressMessage.INVALID_LESSON_ID)
  })
  .strict()

export const UserProgressUserParamsSchema = z
  .object({
    userId: checkIdSchema(UserProgressMessage.INVALID_USER_ID)
  })
  .strict()

// A non-number used to reach Prisma as NaN (500), or turn a filter off
export const GetUserProgressListQuerySchema = z
  .object({
    currentPage: checkIdSchema(UserProgressMessage.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(UserProgressMessage.INVALID_PAGE_SIZE).default(10),
    userId: checkIdSchema(UserProgressMessage.INVALID_USER_ID).optional(),
    lessonId: checkIdSchema(UserProgressMessage.INVALID_LESSON_ID).optional(),
    lessonCategoryId: checkIdSchema(UserProgressMessage.INVALID_CATEGORY_ID).optional(),
    status: ProgressStatusSchema.optional(),
    progressPercentage: z.coerce
      .number({ invalid_type_error: UserProgressMessage.INVALID_PERCENTAGE })
      .int(UserProgressMessage.INVALID_PERCENTAGE)
      .min(0, UserProgressMessage.INVALID_PERCENTAGE)
      .max(100, UserProgressMessage.INVALID_PERCENTAGE)
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
