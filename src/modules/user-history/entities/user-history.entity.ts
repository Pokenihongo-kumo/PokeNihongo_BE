import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { TestStatus } from '@prisma/client'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

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
