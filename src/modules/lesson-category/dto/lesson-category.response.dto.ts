import { z } from 'zod'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import {
  LessonCategorySchema,
  LessonCategoryWithRelationsSchema
} from '../entities/lesson-category.entity'

// Reads (by id, by slug): the translated view, same items as the list
export const LessonCategoryResponseSchema = resSchema(LessonCategoryWithRelationsSchema)

export type LessonCategoryResponse = z.infer<typeof LessonCategoryResponseSchema>

export class LessonCategoryResponseDTO extends createZodDto(
  LessonCategoryResponseSchema
) {}

// Writes (create, update): the stored row, with nameKey
export const LessonCategoryEntityResponseSchema = resSchema(LessonCategorySchema)

export type LessonCategoryEntityResponse = z.infer<
  typeof LessonCategoryEntityResponseSchema
>

export class LessonCategoryEntityResponseDTO extends createZodDto(
  LessonCategoryEntityResponseSchema
) {}

export const LessonCategoryListResponseSchema = paginatedResSchema(
  LessonCategoryWithRelationsSchema
)

export type LessonCategoryListResponse = z.infer<typeof LessonCategoryListResponseSchema>

export class LessonCategoryListResponseDTO extends createZodDto(
  LessonCategoryListResponseSchema
) {}
