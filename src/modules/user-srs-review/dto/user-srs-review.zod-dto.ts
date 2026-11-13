import { createZodDto } from 'nestjs-zod'
import {
  ListSrsQueryType,
  ListSrsTodayQueryType,
  ReviewActionBodyType,
  UpsertSrsReviewBodyType
} from '../entities/user-srs-review.entity'

export class UpsertSrsReviewDto extends createZodDto(UpsertSrsReviewBodyType) {}
export class ReviewActionDto extends createZodDto(ReviewActionBodyType) {}
export class ListSrsQueryDto extends createZodDto(ListSrsQueryType) {}
export class ListSrsTodayQueryDto extends createZodDto(ListSrsTodayQueryType) {}
