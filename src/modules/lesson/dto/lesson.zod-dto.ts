import { createZodDto } from 'nestjs-zod'
import {
  CreateLessonBodyType,
  UpdateLessonBodyType,
  GetLessonByIdParamsType,
  GetLessonListQueryType
} from '../entities/lesson.entities'

// Lesson DTOs
export class CreateLessonBodyDTO extends createZodDto(CreateLessonBodyType) {}
export class UpdateLessonBodyDTO extends createZodDto(UpdateLessonBodyType) {}
export class GetLessonByIdParamsDTO extends createZodDto(GetLessonByIdParamsType) {}
export class GetLessonListQueryDTO extends createZodDto(GetLessonListQueryType) {}
