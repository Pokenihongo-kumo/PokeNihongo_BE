import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { AttendanceConfigSchema } from '../entities/attendence-config.entity'

export const CreateAttendanceConfigBodySchema = AttendanceConfigSchema.pick({
  dayOfWeek: true,
  baseCoin: true,
  bonusCoin: true
}).strict()

export type CreateAttendanceConfigBody = z.infer<typeof CreateAttendanceConfigBodySchema>

export class CreateAttendanceConfigBodyDTO extends createZodDto(
  CreateAttendanceConfigBodySchema
) {}

export const CreateAttendanceConfigResSchema = resSchema(AttendanceConfigSchema)

export class CreateAttendanceConfigResDTO extends createZodDto(
  CreateAttendanceConfigResSchema
) {}

export const UpdateAttendanceConfigBodySchema =
  CreateAttendanceConfigBodySchema.partial().strict()

export type UpdateAttendanceConfigBody = z.infer<typeof UpdateAttendanceConfigBodySchema>

export class UpdateAttendanceConfigBodyDTO extends createZodDto(
  UpdateAttendanceConfigBodySchema
) {}

export const UpdateAttendanceConfigResSchema = CreateAttendanceConfigResSchema

export class UpdateAttendanceConfigResDTO extends createZodDto(
  UpdateAttendanceConfigResSchema
) {}

export const GetParamsAttendanceConfigSchema = z.object({
  attendenceConfigId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export type GetParamsAttendanceConfig = z.infer<typeof GetParamsAttendanceConfigSchema>

export class GetParamsAttendanceConfigDTO extends createZodDto(
  GetParamsAttendanceConfigSchema
) {}

export const GetAttendanceConfigResSchema = resSchema(AttendanceConfigSchema)

export type GetAttendanceConfigRes = z.infer<typeof GetAttendanceConfigResSchema>

export class GetAttendanceConfigResDTO extends createZodDto(
  GetAttendanceConfigResSchema
) {}
