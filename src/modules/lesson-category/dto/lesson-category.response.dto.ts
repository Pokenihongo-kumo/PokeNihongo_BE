import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { LessonCategoryWithRelationsType } from '../entities/lesson-category.entities'

// Response DTOs
export const LessonCategoryResponseSchema = z.object({
  data: LessonCategoryWithRelationsType,
  message: z.string()
})

export const LessonCategoryListResponseSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  data: z.object({
    results: z.array(LessonCategoryWithRelationsType),
    pagination: z.object({
      current: z.number(),
      pageSize: z.number(),
      totalPage: z.number(),
      totalItem: z.number()
    })
  })
})

// DTO Classes
export class LessonCategoryResponseDTO extends createZodDto(
  LessonCategoryResponseSchema
) {}
export class LessonCategoryListResponseDTO extends createZodDto(
  LessonCategoryListResponseSchema
) {}
