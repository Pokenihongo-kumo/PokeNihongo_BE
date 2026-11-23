import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'

import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  UserDailyRequestDetailSchema,
  UserDailyRequestSchema
} from '../entities/user-daily-request.entity'

export const CreateUserDailyRequestBodySchema = UserDailyRequestSchema.pick({
  userId: true,
  dailyRequestId: true
}).strict()

export type CreateUserDailyRequestBody = z.infer<typeof CreateUserDailyRequestBodySchema>

export class CreatedUserDailyRequestBodyDTO extends createZodDto(
  CreateUserDailyRequestBodySchema
) {}

export const CreateUserDailyRequestResSchema = resSchema(UserDailyRequestSchema)

export type CreateUserDailyRequestRes = z.infer<typeof CreateUserDailyRequestResSchema>

export class CreateUserDailyRequestResDTO extends createZodDto(
  CreateUserDailyRequestResSchema
) {}

export const UpdateUserDailyRequestBodySchema = UserDailyRequestSchema.pick({
  userId: true,
  dailyRequestId: true,
  progress: true,
  isCompleted: true,
  completedAt: true
}).partial()

export type UpdateUserDailyRequestBody = z.infer<typeof UpdateUserDailyRequestBodySchema>

export class UpdateUserDailyRequestBodyDTO extends createZodDto(
  UpdateUserDailyRequestBodySchema
) {}

export const UpdateUserDailyRequestResSchema = CreateUserDailyRequestResSchema

export type UpdateUserDailyRequestRes = z.infer<typeof UpdateUserDailyRequestResSchema>

export class UpdateUserDailyRequestResDTO extends createZodDto(
  UpdateUserDailyRequestResSchema
) {}

export const GetUserDailyRequestParamsSchema = z
  .object({
    userDailyRequestId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
  })
  .strict()

export type GetUserDailyRequestParams = z.infer<typeof GetUserDailyRequestParamsSchema>

export class GetUserDailyRequestParamsDTO extends createZodDto(
  GetUserDailyRequestParamsSchema
) {}

export const GetUserDailyRequestDetailResSchema = resSchema(UserDailyRequestDetailSchema)

export type GetUserDailyRequestDetailRes = z.infer<
  typeof GetUserDailyRequestDetailResSchema
>

export class GetUserDailyRequestDetailResDTO extends createZodDto(
  GetUserDailyRequestDetailResSchema
) {}

export const GetListUserDailyRequestTodayDetailResSchema = resSchema(
  z.array(UserDailyRequestDetailSchema)
)

export type GetListUserDailyRequestTodayDetailRes = z.infer<
  typeof GetListUserDailyRequestTodayDetailResSchema
>

export class GetListUserDailyRequestTodayDetailResDTO extends createZodDto(
  GetListUserDailyRequestTodayDetailResSchema
) {}
