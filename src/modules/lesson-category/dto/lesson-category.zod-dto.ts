import { createZodDto } from 'nestjs-zod'
import {
  CreateLessonCategoryBodySchema,
  GetLessonCategoryByIdParamsSchema,
  GetLessonCategoryListQuerySchema,
  UpdateLessonCategoryBodySchema
} from '../entities/lesson-category.entity'

// Lesson Category DTOs
export class CreateLessonCategoryBodyDTO extends createZodDto(
  CreateLessonCategoryBodySchema
) {}
export class UpdateLessonCategoryBodyDTO extends createZodDto(
  UpdateLessonCategoryBodySchema
) {}
export class GetLessonCategoryByIdParamsDTO extends createZodDto(
  GetLessonCategoryByIdParamsSchema
) {}
export class GetLessonCategoryListQueryDTO extends createZodDto(
  GetLessonCategoryListQuerySchema
) {}
