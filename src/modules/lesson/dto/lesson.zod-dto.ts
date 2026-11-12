import { createZodDto } from 'nestjs-zod'
import {
  CreateLessonBodyType,
  UpdateLessonBodyType,
  GetLessonByIdParamsType,
  GetLessonListQueryType,
  LessonResSchema,
  LessonListResSchema
} from '../entities/lesson.entity'

// Lesson DTOs
export class CreateLessonBodyDTO extends createZodDto(CreateLessonBodyType) {}
export class UpdateLessonBodyDTO extends createZodDto(UpdateLessonBodyType) {}
export class GetLessonByIdParamsDTO extends createZodDto(GetLessonByIdParamsType) {}
export class GetLessonListQueryDTO extends createZodDto(GetLessonListQueryType) {}

// Response serializers (they strip unknown fields)
export class LessonResDTO extends createZodDto(LessonResSchema) {}
export class LessonListResDTO extends createZodDto(LessonListResSchema) {}
