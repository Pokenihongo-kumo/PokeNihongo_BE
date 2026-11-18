import { WeekDay } from '@/common/constants/attendence-config.constant'
import { resSchema } from '@/shared/utils/res-schema'

import { checkIdSchema } from '@/common/utils/id.validation'
import { AttendenceConfigMessage, ENTITY_MESSAGE } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const AttendanceConfigSchema = z.object({
  id: z.number(),
  dayOfWeek: z.enum(
    [
      WeekDay.SUNDAY,
      WeekDay.MONDAY,
      WeekDay.TUESDAY,
      WeekDay.WEDNESDAY,
      WeekDay.THURSDAY,
      WeekDay.FRIDAY,
      WeekDay.SATURDAY
    ],
    // i18n key instead of Zod's English enum message
    { errorMap: () => ({ message: AttendenceConfigMessage.INVALID_DAY_OF_WEEK }) }
  ),
  baseCoin: z.number().min(0).default(0),
  bonusCoin: z.number().min(0).default(0),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})
export const CreateAttendanceConfigBodySchema = AttendanceConfigSchema.pick({
  dayOfWeek: true,
  baseCoin: true,
  bonusCoin: true
}).strict()

export const CreateAttendanceConfigResSchema = resSchema(AttendanceConfigSchema)

export const UpdateAttendanceConfigBodySchema =
  CreateAttendanceConfigBodySchema.partial().strict()

export const UpdateAttendanceConfigResSchema = CreateAttendanceConfigResSchema

export const GetParamsAttendanceConfigSchema = z.object({
  attendenceConfigId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetAttendanceConfigResSchema = resSchema(AttendanceConfigSchema)

//type

export type AttendanceConfigType = z.infer<typeof AttendanceConfigSchema>
export type CreateAttendanceConfigBodyType = z.infer<
  typeof CreateAttendanceConfigBodySchema
>
export type UpdateAttendanceConfigBodyType = z.infer<
  typeof UpdateAttendanceConfigBodySchema
>

export type GetParamsAttendanceConfigType = z.infer<
  typeof GetParamsAttendanceConfigSchema
>
export type GetAttendanceConfigResType = z.infer<typeof GetAttendanceConfigResSchema>

//field
type AttendanceConfigFieldType = keyof z.infer<typeof AttendanceConfigSchema>
export const ATTENDANCE_CONFIG_FIELDS = Object.keys(
  AttendanceConfigSchema.shape
) as AttendanceConfigFieldType[]
