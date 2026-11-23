import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  GetUserSeasonHistoryDetailResSchema,
  GetUserSeasonHistoryParamsSchema,
  UpdateUserSeasonHistoryBodySchema,
  UpdateUserSeasonHistoryResSchema
} from './user-season-history.zod-dto'

export type UpdateUserSeasonHistoryBody = z.infer<
  typeof UpdateUserSeasonHistoryBodySchema
>

export class UpdateUserSeasonHistoryBodyDTO extends createZodDto(
  UpdateUserSeasonHistoryBodySchema
) {}

export type GetUserSeasonHistoryParams = z.infer<typeof GetUserSeasonHistoryParamsSchema>

export class GetUserSeasonHistoryParamsDTO extends createZodDto(
  GetUserSeasonHistoryParamsSchema
) {}

export type UpdateUserSeasonHistoryRes = z.infer<typeof UpdateUserSeasonHistoryResSchema>

export class UpdateUserSeasonHistoryResDTO extends createZodDto(
  UpdateUserSeasonHistoryResSchema
) {}
export type GetUserSeasonHistoryDetailRes = z.infer<
  typeof GetUserSeasonHistoryDetailResSchema
>

export class GetUserSeasonHistoryDetailResDTO extends createZodDto(
  GetUserSeasonHistoryDetailResSchema
) {}
