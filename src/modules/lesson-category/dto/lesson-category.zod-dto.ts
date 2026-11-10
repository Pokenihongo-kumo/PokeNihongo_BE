import { createZodDto } from 'nestjs-zod'
import {
  CreateLessonCategoryBodyType,
  UpdateLessonCategoryBodyType,
  GetLessonCategoryByIdParamsType,
  GetLessonCategoryListQueryType
} from '../entities/lesson-category.entity'

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
