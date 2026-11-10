import { paginatedResSchema } from '@/shared/utils/pagination'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  LessonCategoryType,
  LessonCategoryWithRelationsType
} from '../entities/lesson-category.entity'

// Reads (by id, by slug): the translated view, same items as the list
export const LessonCategoryResponseSchema = z.object({
  statusCode: z.number(),
  data: LessonCategoryWithRelationsType,
  message: z.string()
})

// Writes (create, update): the stored row, with nameKey
export const LessonCategoryEntityResponseSchema = z.object({
  statusCode: z.number(),
  data: LessonCategoryType,
  message: z.string()
})

export const LessonCategoryListResponseSchema = paginatedResSchema(
  LessonCategoryWithRelationsType
)

// DTO Classes
export class LessonCategoryResponseDTO extends createZodDto(
  LessonCategoryResponseSchema
) {}
export class LessonCategoryEntityResponseDTO extends createZodDto(
  LessonCategoryEntityResponseSchema
) {}
export class LessonCategoryListResponseDTO extends createZodDto(
  LessonCategoryListResponseSchema
) {}
