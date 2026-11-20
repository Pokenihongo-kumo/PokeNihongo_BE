import { createZodDto } from 'nestjs-zod'
import {
  GetUserSeasonHistoryDetailResSchema,
  GetUserSeasonHistoryParamsSchema,
  UpdateUserSeasonHistoryBodySchema,
  UpdateUserSeasonHistoryResSchema
} from './user-season-history.zod-dto'

export class UpdateUserSeasonHistoryBodyDTO extends createZodDto(
  UpdateUserSeasonHistoryBodySchema
) {}

export class GetUserSeasonHistoryParamsDTO extends createZodDto(
  GetUserSeasonHistoryParamsSchema
) {}
export class UpdateUserSeasonHistoryResDTO extends createZodDto(
  UpdateUserSeasonHistoryResSchema
) {}
export class GetUserSeasonHistoryDetailResDTO extends createZodDto(
  GetUserSeasonHistoryDetailResSchema
) {}
