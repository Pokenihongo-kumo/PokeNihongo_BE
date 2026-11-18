import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { LessonContentsType } from '@prisma/client'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

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

export const LatestExerciseAttemptSchema = z.object({
  id: z.number(),
  userId: z.number(),
  exerciseId: z.number(),
  exerciseType: z.nativeEnum(LessonContentsType),
  status: ExerciseAttemptStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date()
})

// Types
export type ExerciseAttemptStatus = z.infer<typeof ExerciseAttemptStatusSchema>
export type UserExerciseAttempt = z.infer<typeof UserExerciseAttemptSchema>
export type LatestExerciseAttempt = z.infer<typeof LatestExerciseAttemptSchema>
