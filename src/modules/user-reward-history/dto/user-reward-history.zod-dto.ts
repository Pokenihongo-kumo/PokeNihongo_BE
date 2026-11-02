import { createZodDto } from 'nestjs-zod'
import {
  CreateUserRewardHistoryBodySchema,
  UpdateUserRewardHistoryBodySchema,
  GetUserRewardHistoryByIdParamsSchema,
  GetUserRewardHistoryListQuerySchema,
  GetMyRewardHistoryQuerySchema,
  UserRewardHistoryResSchema,
  UserRewardHistoryListResSchema
} from '../entities/user-reward-history.entities'

export class CreateUserRewardHistoryBodyDTO extends createZodDto(
  CreateUserRewardHistoryBodySchema
) {}
export class UpdateUserRewardHistoryBodyDTO extends createZodDto(
  UpdateUserRewardHistoryBodySchema
) {}
export class GetUserRewardHistoryByIdParamsDTO extends createZodDto(
  GetUserRewardHistoryByIdParamsSchema
) {}
export class GetUserRewardHistoryListQueryDTO extends createZodDto(
  GetUserRewardHistoryListQuerySchema
) {}
export class GetMyRewardHistoryQueryDTO extends createZodDto(
  GetMyRewardHistoryQuerySchema
) {}
export class UserRewardHistoryResDTO extends createZodDto(UserRewardHistoryResSchema) {}
export class UserRewardHistoryListResDTO extends createZodDto(
  UserRewardHistoryListResSchema
) {}
