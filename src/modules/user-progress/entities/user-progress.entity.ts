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

// UserProgress with relations schema
export const UserProgressWithRelationsSchema = UserProgressSchema.extend({
  lesson: LessonInfoSchema.optional()
})
export type UserProgress = z.infer<typeof UserProgressSchema>
