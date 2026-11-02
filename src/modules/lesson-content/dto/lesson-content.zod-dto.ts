import { createZodDto } from 'nestjs-zod'
import {
  CreateLessonContentBodyType,
  UpdateLessonContentBodyType,
  GetLessonContentByIdParamsType,
  GetLessonContentListQueryType,
  LessonContentListResSchema,
  UpdateLessonContentOrder,
  LessonContentFullResSchema
} from '../entities/lesson-content.entities'

// Lesson Content DTOs
export class CreateLessonContentBodyDTO extends createZodDto(
  CreateLessonContentBodyType
) {}
export class UpdateLessonContentBodyDTO extends createZodDto(
  UpdateLessonContentBodyType
) {}
export class updateLessonContentOrder extends createZodDto(UpdateLessonContentOrder) {}
export class GetLessonContentByIdParamsDTO extends createZodDto(
  GetLessonContentByIdParamsType
) {}
export class GetLessonContentListQueryDTO extends createZodDto(
  GetLessonContentListQueryType
) {}
export class LessonContentListResDTO extends createZodDto(LessonContentListResSchema) {}
export class LessonContentFullResDTO extends createZodDto(LessonContentFullResSchema) {}
