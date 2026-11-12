import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { LessonContentsType } from '@prisma/client'
import { ExercisesMessage as M } from '@/i18n/message-keys'
import { checkIdSchema } from '@/common/utils/id.validation'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Body ids are JSON numbers (no coercion); params and query use checkIdSchema
const idOf = (key: string) =>
  z.number({ invalid_type_error: key, required_error: key }).int(key).positive(key)

const exerciseType = z.nativeEnum(LessonContentsType, {
  errorMap: () => ({ message: M.INVALID_EXERCISE_TYPE })
})

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

// The exercise type, lesson and test set rules are checked by the service
export const CreateExercisesBodyType = z
  .object({
    exerciseType,
    isBlocked: z.boolean({ invalid_type_error: M.INVALID_IS_BLOCKED }).default(false),
    lessonId: idOf(M.INVALID_LESSON_ID),
    testSetId: idOf(M.INVALID_TEST_SET_ID).optional(),
    rewardId: z.array(idOf(M.INVALID_REWARD_ID)).optional().default([])
  })
  .strict()

export const UpdateExercisesBodyType = z
  .object({
    exerciseType: exerciseType.optional(),
    isBlocked: z.boolean({ invalid_type_error: M.INVALID_IS_BLOCKED }).optional(),
    lessonId: idOf(M.INVALID_LESSON_ID).optional(),
    testSetId: idOf(M.INVALID_TEST_SET_ID).optional(),
    rewardId: z.array(idOf(M.INVALID_REWARD_ID)).optional()
  })
  .strict()

export const GetExercisesByIdParamsType = z.object({
  id: checkIdSchema(M.INVALID_ID)
})

export const GetExercisesByLessonParamsType = z.object({
  lessonId: checkIdSchema(M.INVALID_LESSON_ID)
})

export const GetExercisesListQueryType = z.object({
  currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
  pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).default(10),
  exerciseType: exerciseType.optional(),
  lessonId: checkIdSchema(M.INVALID_LESSON_ID).optional(),
  isBlocked: z
    .enum(['true', 'false'], { errorMap: () => ({ message: M.INVALID_IS_BLOCKED }) })
    .transform((val) => val === 'true')
    .optional(),
  // Matches the test set's name or description
  search: z.string().optional(),
  // Columns of the table (the old enum also listed `price`, which has none)
  sortBy: z
    .enum(['id', 'exerciseType', 'isBlocked', 'lessonId', 'createdAt', 'updatedAt'])
    .optional()
    .default('createdAt'),
  sort: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.toLowerCase() : val),
      z.enum(['asc', 'desc'])
    )
    .optional()
    .default('desc')
})

// Type exports
export type ExercisesType = z.infer<typeof ExercisesType>
export type RewardSummaryType = z.infer<typeof RewardSummarySchema>
export type CreateExercisesBodyType = z.infer<typeof CreateExercisesBodyType>
export type UpdateExercisesBodyType = z.infer<typeof UpdateExercisesBodyType>
export type GetExercisesByIdParamsType = z.infer<typeof GetExercisesByIdParamsType>
export type GetExercisesListQueryType = z.infer<typeof GetExercisesListQueryType>
