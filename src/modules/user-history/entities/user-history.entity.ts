import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { TestStatus } from '@prisma/client'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// History Type enum
export const HistoryTypeSchema = z.enum(['TEST', 'EXERCISE'])

// History Item Schema
export const HistoryItemSchema = z.object({
  id: z.number(),
  type: HistoryTypeSchema,
  testId: z.number().optional().nullable(),
  testName: z.string().optional().nullable(),
  exerciseId: z.number().optional().nullable(),
  exerciseName: z.string().optional().nullable(),
  status: z.string(),
  score: z.number().optional().nullable(),
  totalQuestions: z.number(),
  correctAnswers: z.number(),
  incorrectAnswers: z.number(),
  time: z.number().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Admin History Item Schema (có thêm userId và user info)
export const AdminHistoryItemSchema = HistoryItemSchema.extend({
  userId: z.number().optional(),
  user: z
    .object({
      id: z.number(),
      email: z.string().optional().nullable()
    })
    .optional()
})

// History List Response Schema
export const HistoryListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(HistoryItemSchema),
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

// Admin History List Response Schema (có thể có user info)
export const AdminHistoryListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(AdminHistoryItemSchema),
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

// History List Query Schema
export const GetHistoryListQuerySchema = z
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
    type: HistoryTypeSchema.optional(),
    status: z.string().optional()
  })
  .strict()

// Admin History List Query Schema (có thêm userId để filter)
export const GetAdminHistoryListQuerySchema = z
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
    type: HistoryTypeSchema.optional(),
    status: z.string().optional(),
    userId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional() // Admin có thể filter theo userId
  })
  .strict()

// Recent Exercises Item Schema
export const RecentExerciseItemSchema = z.object({
  exerciseId: z.number(),
  exerciseName: z.string().optional().nullable(),
  lessonId: z.number().optional().nullable(),
  lessonTitle: z.string().optional().nullable(),
  status: z.string()
})

// Recent Exercises Item Schema
export const HistoryExerciseItemSchema = z.object({
  attemptId: z.number(),
  exerciseId: z.number(),
  exerciseName: z.string().optional().nullable(),
  status: z.string(),
  score: z.number().optional().nullable(),
  totalQuestions: z.number(),
  correctAnswers: z.number(),
  incorrectAnswers: z.number(),
  updatedAt: z.date()
})

export const HistoryExercisesResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(HistoryExerciseItemSchema),
      allTime: z.number(), // Tổng thời gian của tất cả attempts (giây)
      allAttempts: z.number(),
      completedAttempts: z.number(),
      failedAttempts: z.number(),
      skippedAttempts: z.number(),
      abandonedAttempts: z.number(),
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

// History Tests Item Schema
export const HistoryTestItemSchema = z.object({
  attemptId: z.number(),
  testId: z.number(),
  testType: z.nativeEnum(TestStatus).optional().nullable(),
  testName: z.string().optional().nullable(),
  status: z.string(),
  score: z.number().optional().nullable(),
  totalQuestions: z.number(),
  correctAnswers: z.number(),
  incorrectAnswers: z.number(),
  updatedAt: z.date()
})

export const HistoryTestsResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(HistoryTestItemSchema),
      allTime: z.number(), // Tổng thời gian của tất cả attempts (giây)
      allAttempts: z.number(),
      completedAttempts: z.number(),
      failedAttempts: z.number(),
      skippedAttempts: z.number(),
      abandonedAttempts: z.number(),
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

// Recent Exercises Query Schema
export const GetRecentExercisesQuerySchema = z
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
    status: z
      .enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ABANDONED', 'SKIPPED'])
      .optional()
  })
  .strict()

// Recent Exercises Response Schema
export const RecentExercisesResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(RecentExerciseItemSchema),
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

// Type exports
export type HistoryType = z.infer<typeof HistoryTypeSchema>
export type HistoryItemType = z.infer<typeof HistoryItemSchema>
export type AdminHistoryItemType = z.infer<typeof AdminHistoryItemSchema>
export type HistoryListResType = z.infer<typeof HistoryListResSchema>
export type AdminHistoryListResType = z.infer<typeof AdminHistoryListResSchema>
export type GetHistoryListQueryType = z.infer<typeof GetHistoryListQuerySchema>
export type GetAdminHistoryListQueryType = z.infer<typeof GetAdminHistoryListQuerySchema>
export type RecentExerciseItemType = z.infer<typeof RecentExerciseItemSchema>
export type HistoryExerciseItemType = z.infer<typeof HistoryExerciseItemSchema>
export type HistoryExercisesResType = z.infer<typeof HistoryExercisesResSchema>
export type HistoryTestItemType = z.infer<typeof HistoryTestItemSchema>
export type HistoryTestsResType = z.infer<typeof HistoryTestsResSchema>
export type GetRecentExercisesQueryType = z.infer<typeof GetRecentExercisesQuerySchema>
export type RecentExercisesResType = z.infer<typeof RecentExercisesResSchema>
