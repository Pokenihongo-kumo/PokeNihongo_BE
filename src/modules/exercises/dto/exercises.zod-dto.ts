import { checkIdSchema } from '@/common/utils/id.validation'
import { ExercisesMessage as M } from '@/i18n/message-keys'
import { LessonContentsType } from '@prisma/client'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Body ids are JSON numbers (no coercion); params and query use checkIdSchema
export const idOf = (key: string) =>
  z.number({ invalid_type_error: key, required_error: key }).int(key).positive(key)

export const exerciseType = z.nativeEnum(LessonContentsType, {
  errorMap: () => ({ message: M.INVALID_EXERCISE_TYPE })
})

// The exercise type, lesson and test set rules are checked by the service

export const CreateExercisesBodySchema = z
  .object({
    exerciseType,
    isBlocked: z.boolean({ invalid_type_error: M.INVALID_IS_BLOCKED }).default(false),
    lessonId: idOf(M.INVALID_LESSON_ID),
    testSetId: idOf(M.INVALID_TEST_SET_ID).optional(),
    rewardId: z.array(idOf(M.INVALID_REWARD_ID)).optional().default([])
  })
  .strict()

export type CreateExercisesBody = z.infer<typeof CreateExercisesBodySchema>

export class CreateExercisesBodyDTO extends createZodDto(CreateExercisesBodySchema) {}

export const UpdateExercisesBodySchema = z
  .object({
    exerciseType: exerciseType.optional(),
    isBlocked: z.boolean({ invalid_type_error: M.INVALID_IS_BLOCKED }).optional(),
    lessonId: idOf(M.INVALID_LESSON_ID).optional(),
    testSetId: idOf(M.INVALID_TEST_SET_ID).optional(),
    rewardId: z.array(idOf(M.INVALID_REWARD_ID)).optional()
  })
  .strict()

export type UpdateExercisesBody = z.infer<typeof UpdateExercisesBodySchema>

export class UpdateExercisesBodyDTO extends createZodDto(UpdateExercisesBodySchema) {}

export const GetExercisesByIdParamsSchema = z.object({
  id: checkIdSchema(M.INVALID_ID)
})

export class GetExercisesByIdParamsDTO extends createZodDto(
  GetExercisesByIdParamsSchema
) {}

export const GetExercisesByLessonParamsSchema = z.object({
  lessonId: checkIdSchema(M.INVALID_LESSON_ID)
})

export class GetExercisesByLessonParamsDTO extends createZodDto(
  GetExercisesByLessonParamsSchema
) {}

export const GetExercisesListQuerySchema = z.object({
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

export type GetExercisesListQuery = z.infer<typeof GetExercisesListQuerySchema>

export class GetExercisesListQueryDTO extends createZodDto(GetExercisesListQuerySchema) {}
