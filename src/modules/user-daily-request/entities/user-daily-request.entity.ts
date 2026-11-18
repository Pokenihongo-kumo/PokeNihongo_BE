import { DailyRequestSchema } from '@/modules/daily-request/entities/daily-request.entity'
import { RewardSchema } from '@/modules/reward/entities/reward.entity'
import { UserSchema } from '@/shared/models/shared-user.model'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

export const UserDailyRequestSchema = z.object({
  id: z.number(),
  userId: z.number(),
  dailyRequestId: z.number(),
  progress: z.number().min(0).default(0),
  isCompleted: z.boolean().default(false),
  completedAt: z.date().nullable(),
  date: z.date(),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const UserDailyRequestDetailSchema = UserDailyRequestSchema.extend({
  dailyRequest: DailyRequestSchema.extend({
    nameTranslation: z.string().optional(),
    descriptionTranslation: z.string().optional().nullable(),
    reward: RewardSchema.pick({
      id: true,
      rewardItem: true,
      rewardTarget: true,
      rewardType: true
    })
      .optional()
      .nullable()
  }).optional(),
  user: UserSchema.omit({ password: true }).optional().nullable()
})

//type

export type UserDailyRequest = z.infer<typeof UserDailyRequestSchema>
export type UserDailyRequestDetail = z.infer<typeof UserDailyRequestDetailSchema>

// field
export type UserDailyRequestFieldType = keyof z.infer<typeof UserDailyRequestSchema>
export const USER_DAILY_REQUEST_FIELDS = Object.keys(
  UserDailyRequestSchema.shape
) as UserDailyRequestFieldType[]
