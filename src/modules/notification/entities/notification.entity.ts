import { NotificationType } from '@/common/constants/notification.constant'
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

export const GetNotificationDetailSchema = NotificationSchema.extend({
  title: z.string().nullable(),
  body: z.string().nullable()
})

// Type exports
export type Notification = z.infer<typeof NotificationSchema>
// Field for query
export type NotificationFieldType = keyof z.infer<typeof NotificationSchema>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  NotificationSchema.shape
) as NotificationFieldType[]
