import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import {
  LessonCategorySchema,
  LessonCategoryWithRelationsSchema
} from '../entities/lesson-category.entity'

// Reads (by id, by slug): the translated view, same items as the list
export const LessonCategoryResponseSchema = resSchema(LessonCategoryWithRelationsSchema)

// Writes (create, update): the stored row, with nameKey
export const LessonCategoryEntityResponseSchema = resSchema(LessonCategorySchema)

export const LessonCategoryListResponseSchema = paginatedResSchema(
  LessonCategoryWithRelationsSchema
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
