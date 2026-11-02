import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { LessonContentWithRelationsType } from '../entities/lesson-content.entities'

// Response DTOs
export const LessonContentResponseSchema = z.object({
  data: LessonContentWithRelationsType,
  message: z.string()
})

export const LessonContentListResponseSchema = z.object({
  data: z.array(LessonContentWithRelationsType),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  message: z.string()
})

// DTO Classes
export class LessonContentResponseDTO extends createZodDto(LessonContentResponseSchema) {}
export class LessonContentListResponseDTO extends createZodDto(
  LessonContentListResponseSchema
) {}
