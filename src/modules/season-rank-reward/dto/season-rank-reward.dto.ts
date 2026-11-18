import { createZodDto } from 'nestjs-zod'
import {
  CreateSeasonRankRewardBodySchema,
  CreateSeasonRankRewardResSchema,
  GetSeasonRankRewardDetailResSchema,
  GetSeasonRankRewardParamsSchema,
  UpdateSeasonRankRewardBodySchema,
  UpdateSeasonRankRewardByRankTypeSchema,
  UpdateSeasonRankRewardResSchema,
  UpdateWithListItemBodySchema,
  UpdateWithListItemResSchema
} from './season-rank-reward.zod-dto'

// Request DTOs
export class CreateSeasonRankRewardBodyDTO extends createZodDto(
  CreateSeasonRankRewardBodySchema
) {}

export class UpdateSeasonRankRewardBodyDTO extends createZodDto(
  UpdateSeasonRankRewardBodySchema
) {}

export class UpdateWithListItemBodyDTO extends createZodDto(
  UpdateWithListItemBodySchema
) {}

export class GetSeasonRankRewardParamsDTO extends createZodDto(
  GetSeasonRankRewardParamsSchema
) {}

// Response DTOs
export class CreateSeasonRankRewardResDTO extends createZodDto(
  CreateSeasonRankRewardResSchema
) {}
export class UpdateSeasonRankRewardResDTO extends createZodDto(
  UpdateSeasonRankRewardResSchema
) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetSeasonRankRewardDetailResDTO extends createZodDto(
  GetSeasonRankRewardDetailResSchema
) {}

export class UpdateSeasonRankRewardByRankTypeDTO extends createZodDto(
  UpdateSeasonRankRewardByRankTypeSchema
) {}
