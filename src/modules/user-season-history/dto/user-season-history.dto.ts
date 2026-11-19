import { createZodDto } from 'nestjs-zod'
import {
  CreateUserSeasonHistoryBodySchema,
  CreateUserSeasonHistoryResSchema,
  GetRewardByLeaderboardParamsSchema,
  GetUserSeasonHistoryDetailResSchema,
  GetUserSeasonHistoryParamsSchema,
  UpdateUserSeasonHistoryBodySchema,
  UpdateUserSeasonHistoryResSchema,
  UpdateWithListItemResSchema
} from './user-season-history.zod-dto'

// Request DTOs
export class CreateUserSeasonHistoryBodyDTO extends createZodDto(
  CreateUserSeasonHistoryBodySchema
) {}

export class UpdateUserSeasonHistoryBodyDTO extends createZodDto(
  UpdateUserSeasonHistoryBodySchema
) {}

export class GetUserSeasonHistoryParamsDTO extends createZodDto(
  GetUserSeasonHistoryParamsSchema
) {}

export class GetRewardByLeaderboardParamsDTO extends createZodDto(
  GetRewardByLeaderboardParamsSchema
) {}

// Response DTOs
export class CreateUserSeasonHistoryResDTO extends createZodDto(
  CreateUserSeasonHistoryResSchema
) {}
export class UpdateUserSeasonHistoryResDTO extends createZodDto(
  UpdateUserSeasonHistoryResSchema
) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetUserSeasonHistoryDetailResDTO extends createZodDto(
  GetUserSeasonHistoryDetailResSchema
) {}
