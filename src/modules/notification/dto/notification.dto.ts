import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateNotificationBodySchema,
  CreateNotificationResSchema,
  GetNotificationDetailResSchema,
  GetNotificationParamsSchema,
  UpdateNotificationBodySchema,
  UpdateNotificationReadListBodySchema,
  UpdateNotificationReadListResSchema,
  UpdateNotificationResSchema
} from './notification.zod-dto'

// Request DTOs

export type CreateNotificationBody = z.infer<typeof CreateNotificationBodySchema>

export class CreateNotificationBodyDTO extends createZodDto(
  CreateNotificationBodySchema
) {}

export type UpdateNotificationBody = z.infer<typeof UpdateNotificationBodySchema>

export class UpdateNotificationBodyDTO extends createZodDto(
  UpdateNotificationBodySchema
) {}

export type UpdateNotificationReadListRes = z.infer<
  typeof UpdateNotificationReadListResSchema
>

export class UpdateNotificationReadListResDTO extends createZodDto(
  UpdateNotificationReadListResSchema
) {}

export type GetNotificationParams = z.infer<typeof GetNotificationParamsSchema>

export class GetNotificationParamsDTO extends createZodDto(GetNotificationParamsSchema) {}

// Response DTOs

export type CreateNotificationRes = z.infer<typeof CreateNotificationResSchema>

export class CreateNotificationResDTO extends createZodDto(CreateNotificationResSchema) {}

export type UpdateNotificationRes = z.infer<typeof UpdateNotificationResSchema>

export class UpdateNotificationResDTO extends createZodDto(UpdateNotificationResSchema) {}

export type UpdateNotificationReadListBody = z.infer<
  typeof UpdateNotificationReadListBodySchema
>

export class UpdateNotificationReadListBodyDTO extends createZodDto(
  UpdateNotificationReadListBodySchema
) {}

export type GetNotificationDetailRes = z.infer<typeof GetNotificationDetailResSchema>

export class GetNotificationDetailResDTO extends createZodDto(
  GetNotificationDetailResSchema
) {}
