import { checkIdSchema } from '@/common/utils/id.validation'
import { UserRewardHistoryMessage } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  invalid,
  RewardTargetSchema,
  UserRewardHistorySchema,
  UserRewardSourceTypeSchema
} from '../entities/user-reward-history.entity'

// Page numbers and ids from the query string: whole numbers above 0 (abc and
// 0 used to become NaN)
export const queryInt = () => z.coerce.number(invalid).int(invalid).positive(invalid)

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

export type CreateUserRewardHistoryBody = z.infer<
  typeof CreateUserRewardHistoryBodySchema
>

export class CreateUserRewardHistoryBodyDTO extends createZodDto(
  CreateUserRewardHistoryBodySchema
) {}

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

export type UpdateUserRewardHistoryBody = z.infer<
  typeof UpdateUserRewardHistoryBodySchema
>

export class UpdateUserRewardHistoryBodyDTO extends createZodDto(
  UpdateUserRewardHistoryBodySchema
) {}

export const GetUserRewardHistoryByIdParamsSchema = z
  .object({
    id: checkIdSchema(UserRewardHistoryMessage.INVALID_DATA)
  })
  .strict()

export class GetUserRewardHistoryByIdParamsDTO extends createZodDto(
  GetUserRewardHistoryByIdParamsSchema
) {}

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

export type GetUserRewardHistoryListQuery = z.infer<
  typeof GetUserRewardHistoryListQuerySchema
>

export class GetUserRewardHistoryListQueryDTO extends createZodDto(
  GetUserRewardHistoryListQuerySchema
) {}

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

export type GetMyRewardHistoryQuery = z.infer<typeof GetMyRewardHistoryQuerySchema>

export class GetMyRewardHistoryQueryDTO extends createZodDto(
  GetMyRewardHistoryQuerySchema
) {}

export const UserRewardHistoryResSchema = resSchema(UserRewardHistorySchema).strict()

export class UserRewardHistoryResDTO extends createZodDto(UserRewardHistoryResSchema) {}

export const UserRewardHistoryListResSchema = paginatedResSchema(
  UserRewardHistorySchema
).strict()

export class UserRewardHistoryListResDTO extends createZodDto(
  UserRewardHistoryListResSchema
) {}
