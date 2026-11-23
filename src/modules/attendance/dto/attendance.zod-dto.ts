import { WeekDay } from '@/common/constants/attendence-config.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { UserSchema } from '@/shared/models/shared-user.model'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { AttendanceSchema, GetAttendanceSchema } from '../entities/attendance.entity'

export const CreateAttendanceBodySchema = AttendanceSchema.pick({
  date: true,
  status: true,
  coin: true,
  bonusCoin: true,
  userId: true
}).strict()

export type CreateAttendanceBody = z.infer<typeof CreateAttendanceBodySchema>

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

export type CreateAttendanceRes = z.infer<typeof CreateAttendanceResSchema>

export class CreateAttendanceResDTO extends createZodDto(CreateAttendanceResSchema) {}

export const UpdateAttendanceBodySchema = AttendanceSchema.pick({
  status: true,
  coin: true,
  bonusCoin: true
}).partial()

export type UpdateAttendanceBody = z.infer<typeof UpdateAttendanceBodySchema>

export class UpdateAttendanceBodyDTO extends createZodDto(UpdateAttendanceBodySchema) {}

export const UpdateAttendanceResSchema = CreateAttendanceResSchema

export type UpdateAttendanceRes = z.infer<typeof UpdateAttendanceResSchema>

export class UpdateAttendanceResDTO extends createZodDto(UpdateAttendanceResSchema) {}

export const GetParamsAttendanceSchema = z.object({
  attendanceId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export type GetParamsAttendance = z.infer<typeof GetParamsAttendanceSchema>

export class GetParamsAttendanceDTO extends createZodDto(GetParamsAttendanceSchema) {}

export const GetParamsDateAttendanceSchema = z.object({
  date: z.date().optional()
})

export type GetParamsDateAttendance = z.infer<typeof GetParamsDateAttendanceSchema>

export class GetParamsDateAttendanceDTO extends createZodDto(
  GetParamsDateAttendanceSchema
) {}

export const GetAttendanceResSchema = resSchema(AttendanceSchema)

export type GetAttendanceRes = z.infer<typeof GetAttendanceResSchema>

export class GetAttendanceResDTO extends createZodDto(GetAttendanceResSchema) {}

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

export type GetAttendanceWithUserStreakRes = z.infer<
  typeof GetAttendanceWithUserStreakResSchema
>

export class GetAttendanceWithUserStreakResDTO extends createZodDto(
  GetAttendanceWithUserStreakResSchema
) {}
