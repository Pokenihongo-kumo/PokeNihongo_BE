import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE, UserAchievementMessage } from '@/i18n/message-keys'
import { PaginationQuerySchema } from '@/shared/models/request.model'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GetUserAchievementDetailSchema,
  UserAchievementSchema
} from '../entities/user-achievement.entity'

// Create Schema

export const CreateUserAchievementBodySchema = UserAchievementSchema.pick({
  userId: true,
  achievementId: true,
  status: true
}).strict()

export type CreateUserAchievementBody = z.infer<typeof CreateUserAchievementBodySchema>

export const CreateUserAchievementResSchema = resSchema(UserAchievementSchema)

// Update Schema

export const UpdateUserAchievementBodySchema =
  CreateUserAchievementBodySchema.partial().strict()

export type UpdateUserAchievementBody = z.infer<typeof UpdateUserAchievementBodySchema>

export const UpdateUserAchievementResSchema = CreateUserAchievementResSchema

// Query Schema

export const GetUserAchievementParamsSchema = z.object({
  userAchievementId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetUserAchievementDetailResSchema = resSchema(GetUserAchievementDetailSchema)

// The app's achievements: groups paginated by currentPage/pageSize, the
// achievements of each group by achCurrentPage/achPageSize (default 1/3)
export const GetUserAchievementListForUserQuerySchema = PaginationQuerySchema.extend({
  achCurrentPage: checkIdSchema(UserAchievementMessage.INVALID_PAGE).default(1),
  achPageSize: checkIdSchema(UserAchievementMessage.INVALID_PAGE_SIZE).default(3),
  achievementGroupId: checkIdSchema(UserAchievementMessage.INVALID_GROUP_ID).optional()
})
