import { UserAchievementStatus } from '@/common/constants/achievement.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE, UserAchievementMessage } from '@/i18n/message-keys'
import { PaginationQuerySchema } from '@/shared/models/request.model'
import { resSchema } from '@/shared/utils/res-schema'
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

// Create Schema
export const CreateUserAchievementBodySchema = UserAchievementSchema.pick({
  userId: true,
  achievementId: true,
  status: true
}).strict()

export const CreateUserAchievementResSchema = resSchema(UserAchievementSchema)

// Update Schema
export const UpdateUserAchievementBodySchema =
  CreateUserAchievementBodySchema.partial().strict()

export const UpdateUserAchievementResSchema = CreateUserAchievementResSchema

export const UpdateWithListItemResSchema = resSchema(z.array(UserAchievementSchema))

// Query Schema
export const GetUserAchievementParamsSchema = z.object({
  userAchievementId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetUserAchievementDetailSchema = UserAchievementSchema

export const GetUserAchievementDetailResSchema = resSchema(GetUserAchievementDetailSchema)

// Type exports
export type UserAchievement = z.infer<typeof UserAchievementSchema>
export type CreateUserAchievementBody = z.infer<typeof CreateUserAchievementBodySchema>
export type UpdateUserAchievementBody = z.infer<typeof UpdateUserAchievementBodySchema>
// The app's achievements: groups paginated by currentPage/pageSize, the
// achievements of each group by achCurrentPage/achPageSize (default 1/3)
export const GetUserAchievementListForUserQuerySchema = PaginationQuerySchema.extend({
  achCurrentPage: checkIdSchema(UserAchievementMessage.INVALID_PAGE).default(1),
  achPageSize: checkIdSchema(UserAchievementMessage.INVALID_PAGE_SIZE).default(3),
  achievementGroupId: checkIdSchema(UserAchievementMessage.INVALID_GROUP_ID).optional()
})

export type GetUserAchievementListForUserQuery = z.infer<
  typeof GetUserAchievementListForUserQuerySchema
>
export type GetUserAchievementParams = z.infer<typeof GetUserAchievementParamsSchema>

// Field for query
export type UserAchievementFieldType = keyof z.infer<typeof UserAchievementSchema>
export const USER_GACHA_PITY_FIELDS = Object.keys(
  UserAchievementSchema.shape
) as UserAchievementFieldType[]
