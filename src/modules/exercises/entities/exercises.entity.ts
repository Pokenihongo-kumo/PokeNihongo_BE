import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { LessonContentsType } from '@prisma/client'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

const RewardSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  rewardType: z.string(),
  rewardItem: z.number(),
  rewardTarget: z.string()
})

// Exercises Entity Types
export const ExercisesSchema = z.object({
  id: z.number(),
  exerciseType: z.nativeEnum(LessonContentsType),
  isBlocked: z.boolean(),
  lessonId: z.number(),
  testSetId: z.number().nullable(),
  rewardId: z.array(z.number()).default([]),
  rewards: z.array(RewardSummarySchema).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Type exports
export type Exercises = z.infer<typeof ExercisesSchema>
export type RewardSummary = z.infer<typeof RewardSummarySchema>
