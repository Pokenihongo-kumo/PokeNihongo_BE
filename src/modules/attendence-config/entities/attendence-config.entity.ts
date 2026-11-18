import { WeekDay } from '@/common/constants/attendence-config.constant'

import { AttendenceConfigMessage } from '@/i18n/message-keys'
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
//type

export type AttendanceConfig = z.infer<typeof AttendanceConfigSchema>
//field
type AttendanceConfigFieldType = keyof z.infer<typeof AttendanceConfigSchema>
export const ATTENDANCE_CONFIG_FIELDS = Object.keys(
  AttendanceConfigSchema.shape
) as AttendanceConfigFieldType[]
