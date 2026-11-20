import { AttendancesStatus } from '@/common/constants/attendance.constant'
import { WeekDay } from '@/common/constants/attendence-config.constant'

import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const AttendanceSchema = z.object({
  id: z.number(),
  date: z.date(),
  status: z.enum([AttendancesStatus.PRESENT, AttendancesStatus.ABSENT]),
  coin: z.number().min(0).default(0),
  bonusCoin: z.number().min(0).default(0),
  userId: z.number(),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const GetAttendanceSchema = AttendanceSchema.extend({
  dayOfWeek: z
    .enum([
      WeekDay.MONDAY,
      WeekDay.TUESDAY,
      WeekDay.WEDNESDAY,
      WeekDay.THURSDAY,
      WeekDay.FRIDAY,
      WeekDay.SATURDAY,
      WeekDay.SUNDAY
    ])
    .optional()
    .nullable()
})

//type
export type Attendance = z.infer<typeof AttendanceSchema>
//field
type AttendanceFieldType = keyof z.infer<typeof AttendanceSchema>
export const ATTENDANCE_FIELDS = Object.keys(
  AttendanceSchema.shape
) as AttendanceFieldType[]
