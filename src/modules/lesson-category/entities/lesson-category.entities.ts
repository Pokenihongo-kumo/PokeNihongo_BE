import { z } from 'zod'

// Lesson Category Entity Types
export const LessonCategoryType = z.object({
  id: z.number(),
  nameKey: z.string(),
  slug: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const LessonCategoryWithRelationsType = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(), // Translated name
  createdAt: z.date(),
  updatedAt: z.date()
})

// Request/Response Types
export const CreateLessonCategoryBodyType = z.object({
  nameKey: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional()
})

export const UpdateLessonCategoryBodyType = z.object({
  nameKey: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional()
})

export const GetLessonCategoryByIdParamsType = z.object({
  id: z.string().transform(Number)
})

export const GetLessonCategoryListQueryType = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  search: z.string().optional()
})

// Response schemas
export const LessonCategoryListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(LessonCategoryType),
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
export type LessonCategoryListResType = z.infer<typeof LessonCategoryListResSchema>
