import { LessonSortField, SortOrder } from '@/common/enum/enum'
import { z } from 'zod'

// Lesson Entity Types
export const LessonType = z.object({
  id: z.number(),
  slug: z.string(),
  titleJp: z.string(),
  titleKey: z.string(),
  title: z
    .union([
      z.string(),
      z.array(
        z.object({
          language: z.string(),
          value: z.string()
        })
      )
    ])
    .optional(),
  levelJlpt: z.number().nullable(),
  estimatedTimeMinutes: z.number(),
  lessonOrder: z.number(),
  isPublished: z.boolean(),
  publishedAt: z.date().nullable(),
  version: z.string(),
  lessonCategoryId: z.number(),
  rewardId: z.array(z.number()).optional().default([]),
  testId: z.number().nullable().optional(),
  createdById: z.number(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const LessonWithRelationsType = LessonType.extend({
  lessonCategory: z
    .object({
      id: z.number(),
      nameKey: z.string(),
      slug: z.string()
    })
    .optional(),
  createdBy: z
    .object({
      id: z.number(),
      name: z.string(),
      email: z.string()
    })
    .optional()
})

// Request/Response Types
export const CreateLessonBodyType = z.object({
  slug: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().min(1).max(200).optional()
  ),
  titleJp: z.string().min(1).max(500),
  levelJlpt: z.number().min(1).max(5).optional(),
  estimatedTimeMinutes: z.number().min(1).max(480).default(30),
  lessonOrder: z.number().min(0).optional(), // Optional: nếu không truyền sẽ tự động tính
  isPublished: z.boolean().default(false),
  version: z.string().default('1.0.0'),
  lessonCategoryId: z.number(),
  rewardId: z.array(z.number().min(1, 'ID phần thưởng không hợp lệ')).optional(),
  testId: z.number().min(1, 'ID bài test không hợp lệ').nullable().optional(),
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

// Default values for Minna no Nihongo Lesson 1
export const MinnaNoNihongoLesson1Data = {
  slug: 'aisatsu-no-kihon',
  titleJp: '挨拶の基本',
  levelJlpt: 5,
  estimatedTimeMinutes: 45,
  lessonOrder: 1,
  isPublished: false,
  version: '1.0.0',
  lessonCategoryId: 1,
  rewardId: [1],
  translations: {
    meaning: [
      {
        language_code: 'vi',
        value: 'Cách chào hỏi cơ bản'
      },
      {
        language_code: 'en',
        value: 'Basic Greetings'
      },
      {
        language_code: 'ja',
        value: '挨拶の基本'
      }
    ]
  }
}

export const UpdateLessonBodyType = CreateLessonBodyType.partial().extend({
  titleKey: z.string().min(1).max(500).optional()
})

export const GetLessonByIdParamsType = z.object({
  id: z.string().transform(Number)
})

export const GetLessonListQueryType = z.object({
  currentPage: z.string().transform(Number).default('1'),
  pageSize: z.string().transform(Number).default('10'),
  search: z.string().optional(),
  lessonCategoryId: z.string().transform(Number).optional(),
  levelJlpt: z.string().transform(Number).optional(),
  isPublished: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  sortBy: z.nativeEnum(LessonSortField).optional().default(LessonSortField.CREATED_AT),
  sort: z.nativeEnum(SortOrder).optional().default(SortOrder.DESC)
})

// Response Schemas
export const LessonListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(LessonWithRelationsType),
      pagination: z.object({
        current: z.number(),
        pageSize: z.number(),
        totalPage: z.number(),
        totalItem: z.number()
      })
    }),
    message: z.string()
  })
  .strict()

// Type exports
export type LessonType = z.infer<typeof LessonType>
export type LessonWithRelationsType = z.infer<typeof LessonWithRelationsType>
export type CreateLessonBodyType = z.infer<typeof CreateLessonBodyType>
export type UpdateLessonBodyType = z.infer<typeof UpdateLessonBodyType>
export type GetLessonByIdParamsType = z.infer<typeof GetLessonByIdParamsType>
export type GetLessonListQueryType = z.infer<typeof GetLessonListQueryType>
export type LessonListResType = z.infer<typeof LessonListResSchema>
export type MinnaNoNihongoLesson1DataType = typeof MinnaNoNihongoLesson1Data
