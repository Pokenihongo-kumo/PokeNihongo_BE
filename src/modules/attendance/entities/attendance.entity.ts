import { AttendancesStatus } from '@/common/constants/attendance.constant'
import { WeekDay } from '@/common/constants/attendence-config.constant'
import { resSchema } from '@/shared/utils/res-schema'

import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { UserSchema } from '@/shared/models/shared-user.model'
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

export const CreateAttendanceBodySchema = AttendanceSchema.pick({
  date: true,
  status: true,
  coin: true,
  bonusCoin: true,
  userId: true
}).strict()

export const CreateAttendanceResSchema = resSchema(
  AttendanceSchema.extend({
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
)

export const UpdateAttendanceBodySchema = AttendanceSchema.pick({
  status: true,
  coin: true,
  bonusCoin: true
}).partial()

export const UpdateAttendanceResSchema = CreateAttendanceResSchema

export const GetParamsAttendanceSchema = z.object({
  attendanceId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetParamsDateAttendanceSchema = z.object({
  date: z.date().optional()
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

export const GetAttendanceWithUserSchema = AttendanceSchema.extend({
  user: UserSchema.pick({
    id: true,
    name: true,
    email: true
  })
})

export const GetAttendanceResSchema = resSchema(AttendanceSchema)

export const GetAttendanceWithUserStreakResSchema = GetAttendanceResSchema.extend({
  data: z.object({
    user: UserSchema.pick({
      id: true,
      name: true,
      email: true
    }),
    attendances: z.array(
      GetAttendanceSchema.extend({
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
    ),
    count: z.number(),
    totalStreak: z.number()
  })
})

//type
export type Attendance = z.infer<typeof AttendanceSchema>
export type CreateAttendanceBody = z.infer<typeof CreateAttendanceBodySchema>
export type UpdateAttendanceBody = z.infer<typeof UpdateAttendanceBodySchema>
export type GetParamsAttendance = z.infer<typeof GetParamsAttendanceSchema>
export type GetParamsDateAttendance = z.infer<typeof GetParamsDateAttendanceSchema>
export type GetAttendance = z.infer<typeof GetAttendanceSchema>
export type GetAttendanceWithUser = z.infer<typeof GetAttendanceWithUserSchema>
export type GetAttendanceWithUserStreak = z.infer<
  typeof GetAttendanceWithUserStreakResSchema
>

//field
type AttendanceFieldType = keyof z.infer<typeof AttendanceSchema>
export const ATTENDANCE_FIELDS = Object.keys(
  AttendanceSchema.shape
) as AttendanceFieldType[]
