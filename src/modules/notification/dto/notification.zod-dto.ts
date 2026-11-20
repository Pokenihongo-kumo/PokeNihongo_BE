import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GetNotificationDetailSchema,
  NotificationSchema
} from '../entities/notification.entity'

// Create Schema

export const CreateNotificationBodySchema = NotificationSchema.pick({
  userId: true,
  titleKey: true,
  bodyKey: true,
  data: true,
  type: true
})

  .strict()

export type CreateNotificationBody = z.infer<typeof CreateNotificationBodySchema>

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

export type UpdateNotificationBody = z.infer<typeof UpdateNotificationBodySchema>

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

export type UpdateNotificationReadListBody = z.infer<
  typeof UpdateNotificationReadListBodySchema
>

export const UpdateNotificationReadListResSchema = resSchema(z.array(NotificationSchema))

export const GetNotificationDetailResSchema = resSchema(GetNotificationDetailSchema)
