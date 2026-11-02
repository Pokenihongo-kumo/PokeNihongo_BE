import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { LessonWithRelationsType, LessonListResSchema } from '../entities/lesson.entities'

// Response DTOs
export const LessonResponseSchema = z.object({
  data: LessonWithRelationsType,
  message: z.string()
})

// Use the schema from entities that matches vocabulary pattern
export const LessonListResponseSchema = LessonListResSchema

// DTO Classes
export class LessonResponseDTO extends createZodDto(LessonResponseSchema) {}
export class LessonListResponseDTO extends createZodDto(LessonListResponseSchema) {}
