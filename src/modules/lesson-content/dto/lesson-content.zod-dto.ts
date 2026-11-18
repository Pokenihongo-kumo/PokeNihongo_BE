import { createZodDto } from 'nestjs-zod'
import {
  CreateLessonContentBodySchema,
  GetLessonContentByIdParamsSchema,
  GetLessonContentListQuerySchema,
  LessonContentFullResSchema,
  LessonContentListResSchema,
  UpdateLessonContentBodySchema,
  UpdateLessonContentOrder
} from '../entities/lesson-content.entities'

// Lesson Content DTOs
export class CreateLessonContentBodyDTO extends createZodDto(
  CreateLessonContentBodySchema
) {}
export class UpdateLessonContentBodyDTO extends createZodDto(
  UpdateLessonContentBodySchema
) {}
export class updateLessonContentOrder extends createZodDto(UpdateLessonContentOrder) {}
export class GetLessonContentByIdParamsDTO extends createZodDto(
  GetLessonContentByIdParamsSchema
) {}
export class GetLessonContentListQueryDTO extends createZodDto(
  GetLessonContentListQuerySchema
) {}
export class LessonContentListResDTO extends createZodDto(LessonContentListResSchema) {}
export class LessonContentFullResDTO extends createZodDto(LessonContentFullResSchema) {}
