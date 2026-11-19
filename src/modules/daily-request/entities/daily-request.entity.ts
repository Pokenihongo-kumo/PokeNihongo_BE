import { dailyRequestType } from '@/common/constants/achievement.constant'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const DailyRequestSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  descriptionKey: z.string(),
  dailyRequestType: z
    .enum([
      dailyRequestType.DAILY_LOGIN,
      dailyRequestType.DAILY_LESSON,
      dailyRequestType.DAILY_EXERCISE,
      dailyRequestType.STREAK_LOGIN,
      dailyRequestType.STREAK_LESSON,
      dailyRequestType.STREAK_EXCERCISE
    ])
    .default(dailyRequestType.DAILY_LESSON),
  conditionValue: z.number().min(1),
  rewardId: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
  isStreak: z.boolean().default(false),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Type definitions
export type DailyRequest = z.infer<typeof DailyRequestSchema>

// Field

type DailyRequestFieldType = keyof z.infer<typeof DailyRequestSchema>
export const DAILY_REQUEST_FIELDS = [
  ...Object.keys(DailyRequestSchema.shape),
  'nameTranslation',
  'descriptionTranslation'
] as DailyRequestFieldType[]
