import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { QuestionType, RoleSpeaking } from '@prisma/client'
import e from 'express'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// QuestionBank schema (updated to match new schema)
export const QuestionBankSchema = z.object({
  id: z.number(),
  questionJp: z.string().nullable().optional(),
  questionType: z.nativeEnum(QuestionType),
  audioUrl: z.string().url().nullable().optional(),
  questionKey: z.string().nullable().optional(),

  role: z.nativeEnum(RoleSpeaking).nullable().optional(),
  pronunciation: z.string().nullable().optional(),
  levelN: z.number().min(1).max(5).nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Schema cho response với _count field và meaning
export const QuestionBankWithCountSchema = QuestionBankSchema.extend({
  _count: z.object({
    answers: z.number(),
    userAnswerLogs: z.number(),
    testSetQuestionBanks: z.number()
  }),
  meaning: z.string().nullable().optional()
})

export const CreateQuestionBankBodySchema = QuestionBankSchema.pick({
  questionJp: true,
  questionType: true,
  audioUrl: true,
  questionKey: true,
  role: true,
  pronunciation: true,
  levelN: true
}).strict()

export const UpdateQuestionBankBodySchema = QuestionBankSchema.pick({
  questionJp: true,
  questionType: true,
  audioUrl: true,
  questionKey: true,
  role: true,
  pronunciation: true,
  levelN: true
})
  .partial()
  .strict()

export const QuestionBankResSchema = z
  .object({
    statusCode: z.number(),
    data: QuestionBankSchema,
    message: z.string()
  })
  .strict()

export const QuestionBankListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(QuestionBankWithCountSchema),
      pagination: z.object({
        current: z.number(),
        pageSize: z.number(),
        totalPage: z.number(),
        totalItem: z.number()
      }),
      levelCounts: z.object({
        N5: z.number(),
        N4: z.number(),
        N3: z.number(),
        N2: z.number(),
        N1: z.number()
      })
    }),
    message: z.string()
  })
  .strict()

export const GetQuestionBankByIdParamsSchema = z
  .object({
    id: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

// Bulk delete schema
export const BulkDeleteQuestionBankBodySchema = z
  .object({
    ids: z
      .array(z.number().min(1))
      .min(1, 'Phải có ít nhất 1 ID')
      .max(100, 'Tối đa 100 ID')
  })
  .strict()

export const GetQuestionBankListQuerySchema = z
  .object({
    currentPage: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('1'),
    pageSize: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('10'),
    levelN: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    questionType: z.nativeEnum(QuestionType).optional(),
    search: z.string().optional(),
    sortBy: z
      .enum(['id', 'questionJp', 'questionType', 'levelN', 'createdAt', 'updatedAt'])
      .optional()
      .default('createdAt'),
    sort: z.enum(['asc', 'desc']).optional().default('desc'),
    language: z.string().optional(),
    testSetId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    noTestSet: z
      .string()
      .optional()
      .transform((val) => val === 'true')
  })
  .strict()

// Schema for getting questions by array of IDs
export const GetQuestionBanksByIdsQuerySchema = z
  .object({
    questionIds: z.preprocess(
      (val) => {
        // Handle different input formats from query parameters
        if (Array.isArray(val)) {
          // Case: ?questionIds=1&questionIds=2 -> ['1', '2']
          return val.flatMap((v) => {
            if (typeof v === 'string') {
              return v
                .split(',')
                .map((id) => parseInt(id.trim(), 10))
                .filter((id) => !isNaN(id))
            }
            return typeof v === 'number' ? [v] : []
          })
        }
        if (typeof val === 'string') {
          // Case: ?questionIds=1,2,3 -> '1,2,3'
          return val
            .split(',')
            .map((id) => parseInt(id.trim(), 10))
            .filter((id) => !isNaN(id))
        }
        if (typeof val === 'number') {
          // Case: ?questionIds=1 -> 1
          return [val]
        }
        return []
      },
      z
        .array(z.number().int().positive())
        .min(1, 'Phải có ít nhất 1 questionId')
        .max(100, 'Tối đa 100 questionIds')
    )
  })
  .strict()

// Types
// Schema for creating question bank with meanings
export const CreateQuestionBankWithMeaningsBodySchema = z
  .object({
    questionJp: z.string(),
    questionType: z.nativeEnum(QuestionType),
    audioUrl: z.string().nullable().optional(),
    questionKey: z.string().nullable().optional(),
    role: z.nativeEnum(RoleSpeaking).nullable().optional(),
    pronunciation: z.string().nullable().optional(),
    levelN: z.number().min(1).max(5).nullable().optional(),
    meanings: z
      .array(
        z.object({
          meaningKey: z.string().nullable().optional(),
          translations: z.record(z.string())
        })
      )
      .optional()
  })
  .strict()

export const UpdateQuestionBankWithMeaningsBodySchema = z
  .object({
    questionJp: z.string().optional(),
    questionType: z.nativeEnum(QuestionType).optional(),
    audioUrl: z.string().nullable().optional(),
    questionKey: z.string().nullable().optional(),
    role: z.nativeEnum(RoleSpeaking).nullable().optional(),
    pronunciation: z.string().nullable().optional(),
    levelN: z.number().min(1).max(5).nullable().optional(),
    meanings: z
      .array(
        z.object({
          meaningKey: z.string().nullable().optional(),
          translations: z.record(z.string())
        })
      )
      .optional()
  })
  .strict()

// Schema for creating question bank with 4 answers
export const CreateQuestionBankWithAnswersBodySchema = z
  .object({
    questionJp: z.string(),
    questionType: z.nativeEnum(QuestionType),
    audioUrl: z.string().nullable().optional(),
    questionKey: z.string().nullable().optional(),
    role: z.nativeEnum(RoleSpeaking).nullable().optional(),
    pronunciation: z.string().nullable().optional(),
    levelN: z.number().min(1).max(5).nullable().optional(),
    meanings: z
      .array(
        z.object({
          meaningKey: z.string().nullable().optional(),
          translations: z.record(z.string())
        })
      )
      .optional(),
    answers: z
      .array(
        z.object({
          answerJp: z.string(),
          isCorrect: z.boolean(),
          translations: z
            .union([
              // Format 1: Simple object with language_code and value
              z.object({
                language_code: z.string(),
                value: z.string()
              }),
              // Format 2: Complex object with meaning array
              z.object({
                meaning: z.array(
                  z.object({
                    language_code: z.string(),
                    value: z.string()
                  })
                )
              })
            ])
            .optional()
        })
      )
      .min(1)
      .max(4)
  })
  .strict()

// Schema for creating question bank with 4 answers
export const UpdatedQuestionBankWithAnswersBodySchema = z
  .object({
    questionJp: z.string(),
    questionType: z.nativeEnum(QuestionType),
    audioUrl: z.string().nullable().optional(),
    questionKey: z.string().nullable().optional(),
    role: z.nativeEnum(RoleSpeaking).nullable().optional(),
    pronunciation: z.string().nullable().optional(),
    levelN: z.number().min(1).max(5).nullable().optional(),
    meanings: z
      .array(
        z.object({
          meaningKey: z.string().nullable().optional(),
          translations: z.record(z.string())
        })
      )
      .optional(),
    answers: z
      .array(
        z.object({
          anwerId: z.number(),
          answerJp: z.string(),
          isCorrect: z.boolean(),
          translations: z
            .union([
              // Format 1: Simple object with language_code and value
              z.object({
                language_code: z.string(),
                value: z.string()
              }),
              // Format 2: Complex object with meaning array
              z.object({
                meaning: z.array(
                  z.object({
                    language_code: z.string(),
                    value: z.string()
                  })
                )
              })
            ])
            .optional()
        })
      )
      .min(1)
      .max(4)
  })
  .strict()

// Types
export type QuestionBankType = z.infer<typeof QuestionBankSchema>
export type CreateQuestionBankBodyType = z.infer<typeof CreateQuestionBankBodySchema>
export type UpdateQuestionBankBodyType = z.infer<typeof UpdateQuestionBankBodySchema>
export type QuestionBankResType = z.infer<typeof QuestionBankResSchema>
export type QuestionBankListResType = z.infer<typeof QuestionBankListResSchema>
export type GetQuestionBankByIdParamsType = z.infer<
  typeof GetQuestionBankByIdParamsSchema
>
export type GetQuestionBankListQueryType = z.infer<typeof GetQuestionBankListQuerySchema>
export type GetQuestionBanksByIdsQueryType = z.infer<
  typeof GetQuestionBanksByIdsQuerySchema
>
export type CreateQuestionBankWithMeaningsBodyType = z.infer<
  typeof CreateQuestionBankWithMeaningsBodySchema
>
export type UpdateQuestionBankWithMeaningsBodyType = z.infer<
  typeof UpdateQuestionBankWithMeaningsBodySchema
>
export type CreateQuestionBankWithAnswersBodyType = z.infer<
  typeof CreateQuestionBankWithAnswersBodySchema
>
export type UpdatedQuestionBankWithAnswersBodyType = z.infer<
  typeof UpdatedQuestionBankWithAnswersBodySchema
>
export type BulkDeleteQuestionBankBodyType = z.infer<
  typeof BulkDeleteQuestionBankBodySchema
>
