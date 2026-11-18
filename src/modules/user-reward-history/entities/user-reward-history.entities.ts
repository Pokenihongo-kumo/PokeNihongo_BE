import { checkIdSchema } from '@/common/utils/id.validation'
import { UserRewardHistoryMessage } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'

const invalid = { message: UserRewardHistoryMessage.INVALID_DATA }
// Page numbers and ids from the query string: whole numbers above 0 (abc and
// 0 used to become NaN)
const queryInt = () => z.coerce.number(invalid).int(invalid).positive(invalid)

export const RewardTargetSchema = z.enum(['EXP', 'POKEMON', 'POKE_COINS', 'SPARKLES'], {
  errorMap: () => ({ message: UserRewardHistoryMessage.INVALID_DATA })
})

export const UserRewardSourceTypeSchema = z.enum(
  [
    'REWARD_SERVICE',
    'LESSON',
    'DAILY_REQUEST',
    'ATTENDANCE',
    'SEASON_REWARD',
    'ADMIN_ADJUST',
    'OTHER',
    'ACHIEVEMENT_REWARD',
    'EXERCISE'
  ],
  { errorMap: () => invalid }
)

export const RewardInfoSchema = z.object({
  id: z.number(),
  name: z.string().nullable().optional(),
  rewardType: z.string(),
  rewardItem: z.number(),
  rewardTarget: RewardTargetSchema
})

export const UserRewardHistorySchema = z.object({
  id: z.number(),
  userId: z.number(),
  rewardId: z.number().nullable(),
  rewardTargetSnapshot: RewardTargetSchema.nullable(),
  amount: z.number().nullable().optional(),
  sourceType: UserRewardSourceTypeSchema,
  sourceId: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
  meta: z.unknown().nullable().optional(),
  createdAt: z.date(),
  reward: RewardInfoSchema.optional()
})

const CreateUserRewardHistoryBodySchemaBase = z
  .object({
    userId: z.number(),
    rewardId: z.number().optional(),
    rewardTargetSnapshot: RewardTargetSchema.optional(),
    amount: z.number().nullable().optional(),
    sourceType: UserRewardSourceTypeSchema,
    sourceId: z.number().optional(),
    note: z.string().max(1000).optional(),
    meta: z.unknown().optional()
  })
  .strict()

export const CreateUserRewardHistoryBodySchema =
  CreateUserRewardHistoryBodySchemaBase.refine(
    (data) => data.rewardId !== undefined || data.rewardTargetSnapshot !== undefined,
    {
      // rewardId or rewardTargetSnapshot is needed
      message: UserRewardHistoryMessage.INVALID_DATA,
      path: ['rewardId']
    }
  )

export const UpdateUserRewardHistoryBodySchema = z
  .object({
    rewardId: z.number().optional(),
    rewardTargetSnapshot: RewardTargetSchema.optional(),
    amount: z.number().nullable().optional(),
    sourceType: UserRewardSourceTypeSchema.optional(),
    sourceId: z.number().nullable().optional(),
    note: z.string().max(1000).optional(),
    meta: z.unknown().optional()
  })
  .strict()

export const GetUserRewardHistoryByIdParamsSchema = z
  .object({
    id: checkIdSchema(UserRewardHistoryMessage.INVALID_DATA)
  })
  .strict()

export const GetUserRewardHistoryListQuerySchema = z
  .object({
    currentPage: queryInt().default(1),
    pageSize: queryInt().default(10),
    userId: queryInt().optional(),
    rewardId: queryInt().optional(),
    sourceType: UserRewardSourceTypeSchema.optional(),
    rewardTargetSnapshot: RewardTargetSchema.optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional()
  })
  .strict()

export const GetMyRewardHistoryQuerySchema = z
  .object({
    currentPage: queryInt().default(1),
    pageSize: queryInt().default(10),
    sourceType: UserRewardSourceTypeSchema.optional(),
    rewardTargetSnapshot: RewardTargetSchema.optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional()
  })
  .strict()

export const UserRewardHistoryResSchema = resSchema(UserRewardHistorySchema).strict()

export const UserRewardHistoryListResSchema = paginatedResSchema(
  UserRewardHistorySchema
).strict()

export type UserRewardHistory = z.infer<typeof UserRewardHistorySchema>
export type CreateUserRewardHistoryBody = z.infer<
  typeof CreateUserRewardHistoryBodySchema
>
export type UpdateUserRewardHistoryBody = z.infer<
  typeof UpdateUserRewardHistoryBodySchema
>
export type UserRewardHistoryRes = z.infer<typeof UserRewardHistoryResSchema>
export type UserRewardHistoryListRes = z.infer<typeof UserRewardHistoryListResSchema>
export type GetUserRewardHistoryByIdParams = z.infer<
  typeof GetUserRewardHistoryByIdParamsSchema
>
export type GetUserRewardHistoryListQuery = z.infer<
  typeof GetUserRewardHistoryListQuerySchema
>
export type GetMyRewardHistoryQuery = z.infer<typeof GetMyRewardHistoryQuerySchema>
