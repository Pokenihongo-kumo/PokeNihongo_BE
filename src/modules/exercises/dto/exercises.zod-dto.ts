import { RewardSummarySchema } from '../entities/exercises.entity'
import { decimalOutSchema } from '@/shared/utils/output-schema'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
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

export type GetExercisesByIdParams = z.infer<typeof GetExercisesByIdParamsSchema>

export class GetExercisesByIdParamsDTO extends createZodDto(
  GetExercisesByIdParamsSchema
) {}

export const GetExercisesByLessonParamsSchema = z.object({
  lessonId: checkIdSchema(M.INVALID_LESSON_ID)
})

export type GetExercisesByLessonParams = z.infer<typeof GetExercisesByLessonParamsSchema>

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

// ---- responses (output only)

const ExerciseRowOutSchema = z.object({
  id: z.number(),
  exerciseType: z.string(),
  isBlocked: z.boolean(),
  lessonId: z.number(),
  testSetId: z.number().nullable(),
  rewardId: z.array(z.number()),
  createdAt: z.date(),
  updatedAt: z.date()
})

const ExerciseTestSetOutSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  content: z.string().nullable(),
  audioUrl: z.string().nullable(),
  price: decimalOutSchema.nullable(),
  levelN: z.number().nullable(),
  testType: z.string(),
  status: z.string()
})

// With its lesson and test set (create, update, list)
export const ExerciseWithRelationsOutSchema = ExerciseRowOutSchema.extend({
  lesson: z.object({ id: z.number(), slug: z.string(), titleKey: z.string() }),
  testSet: ExerciseTestSetOutSchema.nullable()
})

export const ExerciseResSchema = resSchema(ExerciseWithRelationsOutSchema)

export type ExerciseRes = z.infer<typeof ExerciseResSchema>

export class ExerciseResDTO extends createZodDto(ExerciseResSchema) {}

export const ExerciseListResSchema = paginatedResSchema(ExerciseWithRelationsOutSchema)

export type ExerciseListRes = z.infer<typeof ExerciseListResSchema>

export class ExerciseListResDTO extends createZodDto(ExerciseListResSchema) {}

// Detail: the test set's question banks with every answer row
export const ExerciseDetailResSchema = resSchema(
  ExerciseRowOutSchema.extend({
    lesson: z.object({ id: z.number(), slug: z.string(), titleKey: z.string() }),
    testSet: ExerciseTestSetOutSchema.extend({
      testSetQuestionBanks: z.array(
        z.object({
          id: z.number(),
          testSetId: z.number(),
          questionBankId: z.number(),
          questionOrder: z.number(),
          createdAt: z.date(),
          updatedAt: z.date(),
          questionBank: z.object({
            id: z.number(),
            questionJp: z.string().nullable(),
            questionType: z.string(),
            audioUrl: z.string().nullable(),
            questionKey: z.string().nullable(),
            role: z.string().nullable(),
            pronunciation: z.string().nullable(),
            levelN: z.number().nullable(),
            createdById: z.number().nullable(),
            createdAt: z.date(),
            updatedAt: z.date(),
            answers: z.array(
              z.object({
                id: z.number(),
                answerJp: z.string().nullable(),
                answerKey: z.string().nullable(),
                isCorrect: z.boolean(),
                questionBankId: z.number(),
                createdAt: z.date(),
                updatedAt: z.date()
              })
            )
          })
        })
      )
    }).nullable()
  })
)

export type ExerciseDetailRes = z.infer<typeof ExerciseDetailResSchema>

export class ExerciseDetailResDTO extends createZodDto(ExerciseDetailResSchema) {}

// Plain: only what a player needs to answer
export const ExercisePlainResSchema = resSchema(
  z.object({
    id: z.number(),
    exerciseType: z.string(),
    isBlocked: z.boolean(),
    testSetId: z.number().nullable(),
    testSet: z
      .object({
        id: z.number(),
        testSetQuestionBanks: z.array(
          z.object({
            id: z.number(),
            questionOrder: z.number(),
            questionBank: z.object({
              id: z.number(),
              questionJp: z.string().nullable(),
              questionKey: z.string().nullable(),
              answers: z.array(
                z.object({
                  id: z.number(),
                  answerJp: z.string().nullable(),
                  answerKey: z.string().nullable(),
                  isCorrect: z.boolean()
                })
              )
            })
          })
        )
      })
      .nullable()
  })
)

export type ExercisePlainRes = z.infer<typeof ExercisePlainResSchema>

export class ExercisePlainResDTO extends createZodDto(ExercisePlainResSchema) {}

// By lesson: each exercise with its rewards and the lesson's rewards
export const ExercisesByLessonResSchema = resSchema(
  z.array(
    ExerciseRowOutSchema.extend({
      rewards: z.array(RewardSummarySchema),
      rewardLesson: z.array(RewardSummarySchema)
    })
  )
)

export type ExercisesByLessonRes = z.infer<typeof ExercisesByLessonResSchema>

export class ExercisesByLessonResDTO extends createZodDto(ExercisesByLessonResSchema) {}
