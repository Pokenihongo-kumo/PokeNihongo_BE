import { LessonSortField, SortOrder } from '@/common/enum/enum'
import { checkIdSchema } from '@/common/utils/id.validation'
import { LessonMessage as M } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { LessonWithRelationsSchema } from '../entities/lesson.entity'

// Body ids are JSON numbers (no coercion); params and query use checkIdSchema
export const idOf = (key: string) =>
  z.number({ invalid_type_error: key, required_error: key }).int(key).positive(key)

export const CreateLessonBodySchema = z.object({
  // Ignored: the slug is always lesson-{id}
  slug: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().min(1, M.INVALID_SLUG).max(200, M.INVALID_SLUG).optional()
  ),
  titleJp: z
    .string({
      required_error: M.INVALID_TITLE_JP,
      invalid_type_error: M.INVALID_TITLE_JP
    })
    .min(1, M.INVALID_TITLE_JP)
    .max(500, M.INVALID_TITLE_JP),
  levelJlpt: z
    .number({ invalid_type_error: M.INVALID_LEVEL })
    .int(M.INVALID_LEVEL)
    .min(1, M.INVALID_LEVEL)
    .max(5, M.INVALID_LEVEL)
    .optional(),
  estimatedTimeMinutes: z
    .number({ invalid_type_error: M.INVALID_ESTIMATED_TIME })
    .int(M.INVALID_ESTIMATED_TIME)
    .min(1, M.INVALID_ESTIMATED_TIME)
    .max(480, M.INVALID_ESTIMATED_TIME)
    .default(30),
  // Without it: after the last lesson of the category
  lessonOrder: z
    .number({ invalid_type_error: M.INVALID_LESSON_ORDER })
    .int(M.INVALID_LESSON_ORDER)
    .min(0, M.INVALID_LESSON_ORDER)
    .optional(),
  isPublished: z.boolean().default(false),
  version: z.string().default('1.0.0'),
  lessonCategoryId: idOf(M.INVALID_CATEGORY_ID),
  rewardId: z.array(idOf(M.INVALID_REWARD_ID)).optional(),
  testId: idOf(M.INVALID_TEST_ID).nullable().optional(),
  // Title translations; without them the title is titleJp in vi and en
  translations: z
    .object({
      meaning: z.array(
        z.object({
          language_code: z.string(),
          value: z.string()
        })
      )
    })
    .optional()
})

export type CreateLessonBody = z.infer<typeof CreateLessonBodySchema>

// Lesson DTOs
export class CreateLessonBodyDTO extends createZodDto(CreateLessonBodySchema) {}

export const UpdateLessonBodySchema = CreateLessonBodySchema.partial().extend({
  titleKey: z.string().min(1).max(500).optional()
})

export type UpdateLessonBody = z.infer<typeof UpdateLessonBodySchema>

export class UpdateLessonBodyDTO extends createZodDto(UpdateLessonBodySchema) {}

export const GetLessonByIdParamsSchema = z.object({
  id: checkIdSchema(M.INVALID_ID)
})

export type GetLessonByIdParams = z.infer<typeof GetLessonByIdParamsSchema>

export class GetLessonByIdParamsDTO extends createZodDto(GetLessonByIdParamsSchema) {}

export const GetLessonListQuerySchema = z.object({
  currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
  pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).default(10),
  // Matches the slug or the title key
  search: z.string().optional(),
  lessonCategoryId: checkIdSchema(M.INVALID_CATEGORY_ID).optional(),
  levelJlpt: z.coerce
    .number({ invalid_type_error: M.INVALID_LEVEL })
    .int(M.INVALID_LEVEL)
    .min(1, M.INVALID_LEVEL)
    .max(5, M.INVALID_LEVEL)
    .optional(),
  isPublished: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  sortBy: z.nativeEnum(LessonSortField).optional().default(LessonSortField.CREATED_AT),
  sort: z.nativeEnum(SortOrder).optional().default(SortOrder.DESC),
  // Title language (query, not Accept-Language: without it the title is an array)
  lang: z.string().optional()
})

export type GetLessonListQuery = z.infer<typeof GetLessonListQuerySchema>

export class GetLessonListQueryDTO extends createZodDto(GetLessonListQuerySchema) {}

// Response Schemas

export const LessonResSchema = resSchema(LessonWithRelationsSchema)

// Response serializers (they strip unknown fields)

export type LessonRes = z.infer<typeof LessonResSchema>

export class LessonResDTO extends createZodDto(LessonResSchema) {}

export const LessonListResSchema = paginatedResSchema(LessonWithRelationsSchema)

export type LessonListRes = z.infer<typeof LessonListResSchema>

export class LessonListResDTO extends createZodDto(LessonListResSchema) {}
