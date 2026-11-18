import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { DailyRequestSchema } from '@/modules/daily-request/entities/daily-request.entity'
import { RewardSchema } from '@/modules/reward/entities/reward.entity'
import { UserSchema } from '@/shared/models/shared-user.model'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { date, z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

export const UserDailyRequestSchema = z.object({
  id: z.number(),
  userId: z.number(),
  dailyRequestId: z.number(),
  progress: z.number().min(0).default(0),
  isCompleted: z.boolean().default(false),
  completedAt: z.date().nullable(),
  date: date(),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateUserDailyRequestBodySchema = UserDailyRequestSchema.pick({
  userId: true,
  dailyRequestId: true
}).strict()

export const CreateUserDailyRequestResSchema = resSchema(UserDailyRequestSchema)

export const UpdateUserDailyRequestBodySchema = UserDailyRequestSchema.pick({
  userId: true,
  dailyRequestId: true,
  progress: true,
  isCompleted: true,
  completedAt: true
}).partial()
export const UpdateUserDailyRequestResSchema = CreateUserDailyRequestResSchema

export const GetUserDailyRequestParamsSchema = z
  .object({
    userDailyRequestId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
  })
  .strict()

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

export const GetUserDailyRequestDetailResSchema = resSchema(UserDailyRequestDetailSchema)

export const GetListUserDailyRequestTodayDetailResSchema = resSchema(
  z.array(UserDailyRequestDetailSchema)
)

export const GetRewardListUserDailyRequestTodayDetailResSchema = resSchema(
  z.object({
    rewardsReceived: z.array(
      RewardSchema.pick({
        id: true,
        rewardType: true,
        rewardTarget: true,
        rewardItem: true
      })
    )
  })
)

//type

export type UserDailyRequestType = z.infer<typeof UserDailyRequestSchema>
export type CreateUserDailyRequestBodyType = z.infer<
  typeof CreateUserDailyRequestBodySchema
>
export type UpdateUserDailyRequestBodyType = z.infer<
  typeof UpdateUserDailyRequestBodySchema
>
export type GetUserDailyRequestParamsSchemaType = z.infer<
  typeof GetUserDailyRequestParamsSchema
>
export type GetUserDailyRequestDetailResType = z.infer<
  typeof GetUserDailyRequestDetailResSchema
>

export type UserDailyRequestDetailType = z.infer<typeof UserDailyRequestDetailSchema>

// field
export type UserDailyRequestFieldType = keyof z.infer<typeof UserDailyRequestSchema>
export const USER_DAILY_REQUEST_FIELDS = Object.keys(
  UserDailyRequestSchema.shape
) as UserDailyRequestFieldType[]
