import { createZodDto } from 'nestjs-zod'
import {
  CreateLessonBodySchema,
  GetLessonByIdParamsSchema,
  GetLessonListQuerySchema,
  LessonListResSchema,
  LessonResSchema,
  UpdateLessonBodySchema
} from '../entities/lesson.entity'

// Lesson DTOs
export class CreateLessonBodyDTO extends createZodDto(CreateLessonBodySchema) {}
export class UpdateLessonBodyDTO extends createZodDto(UpdateLessonBodySchema) {}
export class GetLessonByIdParamsDTO extends createZodDto(GetLessonByIdParamsSchema) {}
export class GetLessonListQueryDTO extends createZodDto(GetLessonListQuerySchema) {}

// Response serializers (they strip unknown fields)
export class LessonResDTO extends createZodDto(LessonResSchema) {}
export class LessonListResDTO extends createZodDto(LessonListResSchema) {}
