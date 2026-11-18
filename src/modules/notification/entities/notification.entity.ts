import { NotificationType } from '@/common/constants/notification.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base Notification Schema
export const NotificationSchema = z.object({
  id: z.number(),
  userId: z.number(),
  titleKey: z.string(),
  bodyKey: z.string(),
  type: z
    .enum([
      NotificationType.REWARD,
      NotificationType.LESSON,
      NotificationType.EXERCISE,
      NotificationType.ACHIEVEMENT,
      NotificationType.SEASON,
      NotificationType.LEVEL,
      NotificationType.SYSTEM,
      NotificationType.OTHER,
      NotificationType.ATTENDANCE
    ])
    .default(NotificationType.OTHER),
  isRead: z.boolean().default(false),
  data: z.any().nullable(),

  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateNotificationBodySchema = NotificationSchema.pick({
  userId: true,
  titleKey: true,
  bodyKey: true,
  data: true,
  type: true
})

  .strict()

export const CreateNotificationResSchema = resSchema(NotificationSchema)

// Update Schema
export const UpdateNotificationBodySchema = NotificationSchema.pick({
  titleKey: true,
  bodyKey: true,
  data: true,
  isRead: true
})
  .partial()
  .strict()

export const UpdateNotificationResSchema = CreateNotificationResSchema

// Query Schema
export const GetNotificationParamsSchema = z.object({
  notificationId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const UpdateNotificationReadListBodySchema = z
  .object({
    notificationIds: z.array(checkIdSchema(ENTITY_MESSAGE.INVALID_ID)).min(1)
  })
  .strict()

export const UpdateNotificationReadListResSchema = resSchema(z.array(NotificationSchema))

export const GetRewardByLeaderboardParamsSchema = z.object({
  leaderboardSeasonId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetNotificationDetailSchema = NotificationSchema.extend({
  title: z.string().nullable(),
  body: z.string().nullable()
})

export const GetNotificationDetailResSchema = resSchema(GetNotificationDetailSchema)

// Type exports
export type Notification = z.infer<typeof NotificationSchema>
export type CreateNotificationBody = z.infer<typeof CreateNotificationBodySchema>
export type UpdateNotificationBody = z.infer<typeof UpdateNotificationBodySchema>
export type UpdateNotificationReadListBody = z.infer<
  typeof UpdateNotificationReadListBodySchema
>
export type GetNotificationParams = z.infer<typeof GetNotificationParamsSchema>

// Field for query
export type NotificationFieldType = keyof z.infer<typeof NotificationSchema>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  NotificationSchema.shape
) as NotificationFieldType[]
