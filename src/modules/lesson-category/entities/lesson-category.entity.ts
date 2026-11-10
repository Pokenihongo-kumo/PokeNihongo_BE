import { checkIdSchema } from '@/common/utils/id.validation'
import { LessonCategoryMessage } from '@/i18n/message-keys'
import { z } from 'zod'

// Lesson Category Entity Types
export const LessonCategoryType = z.object({
  id: z.number(),
  nameKey: z.string(),
  slug: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// What reads return: the name translated for the request language
export const LessonCategoryWithRelationsType = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(), // Translated name
  createdAt: z.date(),
  updatedAt: z.date()
})

// Request/Response Types
export const CreateLessonCategoryBodyType = z.object({
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

export const UpdateLessonCategoryBodyType = z.object({
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

export const GetLessonCategoryByIdParamsType = z.object({
  id: checkIdSchema(LessonCategoryMessage.INVALID_ID)
})

export const GetLessonCategoryListQueryType = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  search: z.string().optional()
})

// Type exports
export type LessonCategoryType = z.infer<typeof LessonCategoryType>
export type LessonCategoryWithRelationsType = z.infer<
  typeof LessonCategoryWithRelationsType
>
export type CreateLessonCategoryBodyType = z.infer<typeof CreateLessonCategoryBodyType>
export type UpdateLessonCategoryBodyType = z.infer<typeof UpdateLessonCategoryBodyType>
export type GetLessonCategoryByIdParamsType = z.infer<
  typeof GetLessonCategoryByIdParamsType
>
export type GetLessonCategoryListQueryType = z.infer<
  typeof GetLessonCategoryListQueryType
>
