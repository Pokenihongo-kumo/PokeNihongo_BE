import { checkIdSchema } from '@/common/utils/id.validation'
import { LessonCategoryMessage } from '@/i18n/message-keys'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Request/Response Types

export const CreateLessonCategoryBodySchema = z.object({
  nameKey: z
    .string()
    .min(1, LessonCategoryMessage.NAME_KEY_REQUIRED)
    .max(200, LessonCategoryMessage.NAME_KEY_TOO_LONG),
  slug: z
    .string()
    .min(1, LessonCategoryMessage.SLUG_REQUIRED)
    .max(200, LessonCategoryMessage.SLUG_TOO_LONG)
    .optional()
})

export type CreateLessonCategoryBody = z.infer<typeof CreateLessonCategoryBodySchema>

// Lesson Category DTOs
export class CreateLessonCategoryBodyDTO extends createZodDto(
  CreateLessonCategoryBodySchema
) {}

export const UpdateLessonCategoryBodySchema = z.object({
  nameKey: z
    .string()
    .min(1, LessonCategoryMessage.NAME_KEY_REQUIRED)
    .max(200, LessonCategoryMessage.NAME_KEY_TOO_LONG)
    .optional(),
  slug: z
    .string()
    .min(1, LessonCategoryMessage.SLUG_REQUIRED)
    .max(200, LessonCategoryMessage.SLUG_TOO_LONG)
    .optional()
})

export type UpdateLessonCategoryBody = z.infer<typeof UpdateLessonCategoryBodySchema>

export class UpdateLessonCategoryBodyDTO extends createZodDto(
  UpdateLessonCategoryBodySchema
) {}

export const GetLessonCategoryByIdParamsSchema = z.object({
  id: checkIdSchema(LessonCategoryMessage.INVALID_ID)
})

export type GetLessonCategoryByIdParams = z.infer<
  typeof GetLessonCategoryByIdParamsSchema
>

export class GetLessonCategoryByIdParamsDTO extends createZodDto(
  GetLessonCategoryByIdParamsSchema
) {}

export const GetLessonCategoryListQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  search: z.string().optional()
})

export type GetLessonCategoryListQuery = z.infer<typeof GetLessonCategoryListQuerySchema>

export class GetLessonCategoryListQueryDTO extends createZodDto(
  GetLessonCategoryListQuerySchema
) {}
