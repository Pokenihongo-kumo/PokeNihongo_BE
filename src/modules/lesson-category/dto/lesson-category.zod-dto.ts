import { createZodDto } from 'nestjs-zod'
import {
  CreateLessonCategoryBodyType,
  UpdateLessonCategoryBodyType,
  GetLessonCategoryByIdParamsType,
  GetLessonCategoryListQueryType,
  LessonCategoryListResSchema
} from '../entities/lesson-category.entities'

// Lesson Category DTOs
export class CreateLessonCategoryBodyDTO extends createZodDto(
  CreateLessonCategoryBodyType
) {}
export class UpdateLessonCategoryBodyDTO extends createZodDto(
  UpdateLessonCategoryBodyType
) {}
export class GetLessonCategoryByIdParamsDTO extends createZodDto(
  GetLessonCategoryByIdParamsType
) {}
export class GetLessonCategoryListQueryDTO extends createZodDto(
  GetLessonCategoryListQueryType
) {}
export class LessonCategoryListResDTO extends createZodDto(LessonCategoryListResSchema) {}
