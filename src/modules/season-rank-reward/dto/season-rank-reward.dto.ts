import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateSeasonRankRewardBodySchema,
  CreateSeasonRankRewardResSchema,
  GetSeasonRankRewardDetailResSchema,
  GetSeasonRankRewardParamsSchema,
  UpdateSeasonRankRewardBodySchema,
  UpdateSeasonRankRewardResSchema,
  UpdateWithListItemBodySchema,
  UpdateWithListItemResSchema
} from './season-rank-reward.zod-dto'

// Request DTOs

export type CreateSeasonRankRewardBody = z.infer<typeof CreateSeasonRankRewardBodySchema>

export class CreateSeasonRankRewardBodyDTO extends createZodDto(
  CreateSeasonRankRewardBodySchema
) {}

export type UpdateSeasonRankRewardBody = z.infer<typeof UpdateSeasonRankRewardBodySchema>

export class UpdateSeasonRankRewardBodyDTO extends createZodDto(
  UpdateSeasonRankRewardBodySchema
) {}

export type UpdateWithListItemBody = z.infer<typeof UpdateWithListItemBodySchema>

export class UpdateWithListItemBodyDTO extends createZodDto(
  UpdateWithListItemBodySchema
) {}

export type GetSeasonRankRewardParams = z.infer<typeof GetSeasonRankRewardParamsSchema>

export class GetSeasonRankRewardParamsDTO extends createZodDto(
  GetSeasonRankRewardParamsSchema
) {}

// Response DTOs

export type CreateSeasonRankRewardRes = z.infer<typeof CreateSeasonRankRewardResSchema>

export class CreateSeasonRankRewardResDTO extends createZodDto(
  CreateSeasonRankRewardResSchema
) {}

export type UpdateSeasonRankRewardRes = z.infer<typeof UpdateSeasonRankRewardResSchema>

export class UpdateSeasonRankRewardResDTO extends createZodDto(
  UpdateSeasonRankRewardResSchema
) {}

export type UpdateWithListItemRes = z.infer<typeof UpdateWithListItemResSchema>

export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export type GetSeasonRankRewardDetailRes = z.infer<
  typeof GetSeasonRankRewardDetailResSchema
>

export class GetSeasonRankRewardDetailResDTO extends createZodDto(
  GetSeasonRankRewardDetailResSchema
) {}
