import { UserAchievementStatus } from '@/common/constants/achievement.constant'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base UserAchievement Schema
export const UserAchievementSchema = z.object({
  id: z.number(),
  userId: z.number(),
  achievementId: z.number(),
  achievedAt: z.date().nullable(),
  status: z
    .enum([
      UserAchievementStatus.IN_PROGRESS,
      UserAchievementStatus.COMPLETED_NOT_CLAIMED,
      UserAchievementStatus.CLAIMED
    ])
    .default(UserAchievementStatus.IN_PROGRESS),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const GetUserAchievementDetailSchema = UserAchievementSchema

// Type exports
export type UserAchievement = z.infer<typeof UserAchievementSchema>
// Field for query
export type UserAchievementFieldType = keyof z.infer<typeof UserAchievementSchema>
export const USER_GACHA_PITY_FIELDS = Object.keys(
  UserAchievementSchema.shape
) as UserAchievementFieldType[]
