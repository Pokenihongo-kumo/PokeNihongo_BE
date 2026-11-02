import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { ExercisesSortField, SortOrder } from '@/common/enum/enum'
import { LessonContentsType } from '@prisma/client'

extendZodWithOpenApi(z)
patchNestJsSwagger()

const RewardSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  rewardType: z.string(),
  rewardItem: z.number(),
  rewardTarget: z.string()
})

// Exercises Entity Types
export const ExercisesType = z.object({
  id: z.number(),
  exerciseType: z.nativeEnum(LessonContentsType),
  isBlocked: z.boolean(),
  lessonId: z.number(),
  testSetId: z.number().nullable(),
  rewardId: z.array(z.number()).default([]),
  rewards: z.array(RewardSummarySchema).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Request/Response Types
export const CreateExercisesBodyType = z.object({
  exerciseType: z.nativeEnum(LessonContentsType, {
    required_error: 'Loại bài tập không được để trống',
    invalid_type_error: 'Loại bài tập không hợp lệ'
  }),
  isBlocked: z.boolean().default(false),
  lessonId: z.number().min(1, 'ID bài học không hợp lệ'),
  testSetId: z.number().min(1, 'ID bộ đề không hợp lệ').optional(),
  rewardId: z
    .array(z.number().min(1, 'ID phần thưởng không hợp lệ'))
    .optional()
    .default([])
})

export const UpdateExercisesBodyType = z.object({
  exerciseType: z.nativeEnum(LessonContentsType).optional(),
  isBlocked: z.boolean().optional(),
  lessonId: z.number().min(1, 'ID bài học không hợp lệ').optional(),
  testSetId: z.number().min(1, 'ID bộ đề không hợp lệ').optional(),
  rewardId: z.array(z.number().min(1, 'ID phần thưởng không hợp lệ')).optional()
})

export const GetExercisesByIdParamsType = z.object({
  id: z.string().transform(Number)
})

export const GetExercisesListQueryType = z.object({
  currentPage: z
    .string()
    .transform((val) => (val ? Number(val) : 1))
    .default('1'),
  pageSize: z
    .string()
    .transform((val) => (val ? Number(val) : 10))
    .default('10'),
  exerciseType: z.nativeEnum(LessonContentsType).optional(),
  lessonId: z
    .string()
    .transform((val) => (val ? Number(val) : undefined))
    .optional(),
  isBlocked: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  search: z.string().optional(),
  sortBy: z
    .nativeEnum(ExercisesSortField)
    .optional()
    .default(ExercisesSortField.CREATED_AT),
  sort: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.toLowerCase() : val),
      z.nativeEnum(SortOrder)
    )
    .optional()
    .default(SortOrder.DESC)
})

// Response schemas
export const ExercisesListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(ExercisesType),
      pagination: z.object({
        currentPage: z.number(),
        pageSize: z.number(),
        totalPage: z.number(),
        totalItem: z.number()
      })
    }),
    message: z.string()
  })
  .strict()

// Type exports
export type ExercisesType = z.infer<typeof ExercisesType>
export type RewardSummaryType = z.infer<typeof RewardSummarySchema>
export type CreateExercisesBodyType = z.infer<typeof CreateExercisesBodyType>
export type UpdateExercisesBodyType = z.infer<typeof UpdateExercisesBodyType>
export type GetExercisesByIdParamsType = z.infer<typeof GetExercisesByIdParamsType>
export type GetExercisesListQueryType = z.infer<typeof GetExercisesListQueryType>
export type ExercisesListResType = z.infer<typeof ExercisesListResSchema>
