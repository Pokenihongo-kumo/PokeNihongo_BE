import { createZodDto } from 'nestjs-zod'
import {
  ListSrsQuerySchema,
  ListSrsTodayQuerySchema,
  ReviewActionBodySchema,
  SrsReviewIdParamsSchema,
  UpsertSrsReviewBodySchema
} from '../entities/user-srs-review.entity'

export class UpsertSrsReviewDto extends createZodDto(UpsertSrsReviewBodySchema) {}
export class ReviewActionDto extends createZodDto(ReviewActionBodySchema) {}
export class ListSrsQueryDto extends createZodDto(ListSrsQuerySchema) {}
export class ListSrsTodayQueryDto extends createZodDto(ListSrsTodayQuerySchema) {}
export class SrsReviewIdParamsDto extends createZodDto(SrsReviewIdParamsSchema) {}
