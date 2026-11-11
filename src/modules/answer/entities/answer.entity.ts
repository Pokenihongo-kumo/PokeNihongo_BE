import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { AnswerSortField, SortOrder } from '@/common/enum/enum'
import { checkIdSchema } from '@/common/utils/id.validation'
import { AnswerMessage } from '@/i18n/message-keys'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Answer Entity Types
export const AnswerType = z.object({
  id: z.number(),
  answerJp: z.string(),
  answerKey: z.string(),
  isCorrect: z.boolean(),
  questionBankId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Answer with translation for list (without answerKey)
export const AnswerWithTranslationType = AnswerType.omit({ answerKey: true })
  .extend({
    meaning: z.string().optional(),
    meanings: z
      .array(
        z.object({
          language: z.string(),
          value: z.string()
        })
      )
      .optional(),
    // Parsed fields from combined format "jp:...+vi:...+en:..." (optional)
    answerVi: z.string().optional(),
    answerEn: z.string().optional(),
    questionBank: z
      .object({
        id: z.number(),
        questionJp: z.string(),
        questionKey: z.string().nullable().optional()
      })
      .optional()
  })
  .strict()

// Request/Response Types
export const CreateAnswerBodyType = z.object({
  answerJp: z
    .string()
    .min(1, AnswerMessage.ANSWER_JP_REQUIRED)
    .max(1000, AnswerMessage.ANSWER_JP_TOO_LONG),
  isCorrect: z.boolean().default(false),
  questionBankId: z.number().min(1, AnswerMessage.QUESTION_ID_INVALID),
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

// Schema for creating multiple answers
export const CreateMultipleAnswersBodyType = z.object({
  questionBankId: z.number().min(1, AnswerMessage.QUESTION_ID_INVALID),
  answers: z
    .array(
      z.object({
        id: z.number().min(1, AnswerMessage.INVALID_ID).optional(), // Optional: nếu có ID → update answer đó, nếu không → upsert bằng answerJp
        answerJp: z
          .string()
          .min(1, AnswerMessage.ANSWER_JP_REQUIRED)
          .max(1000, AnswerMessage.ANSWER_JP_TOO_LONG),
        isCorrect: z.boolean().default(false),
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
    .min(1, AnswerMessage.ANSWERS_REQUIRED)
    .max(10, AnswerMessage.ANSWERS_TOO_MANY)
})

export const UpdateAnswerBodyType = z.object({
  answerJp: z
    .string()
    .min(1, AnswerMessage.ANSWER_JP_REQUIRED)
    .max(1000, AnswerMessage.ANSWER_JP_TOO_LONG)
    .optional(),
  isCorrect: z.boolean().optional(),
  questionBankId: z.number().min(1, AnswerMessage.QUESTION_ID_INVALID).optional(),
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

export const GetAnswerByIdParamsType = z.object({
  id: checkIdSchema(AnswerMessage.INVALID_ID)
})

export const GetAnswerListQueryType = z.object({
  currentPage: z.string().transform(Number).default('1'),
  pageSize: z.string().transform(Number).default('10'),
  questionBankId: z.string().transform(Number).optional(),
  isCorrect: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  search: z.string().optional(),
  sortBy: z.nativeEnum(AnswerSortField).optional().default(AnswerSortField.CREATED_AT),
  sort: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.toLowerCase() : val),
      z.nativeEnum(SortOrder)
    )
    .optional()
    .default(SortOrder.DESC),
  language: z.string().optional()
})

// Response schemas
export const AnswerResponseSchema = z
  .object({
    statusCode: z.number(),
    data: AnswerType.omit({ answerKey: true }).extend({
      meaning: z.string().optional(),
      meanings: z
        .array(
          z.object({
            language_code: z.string(),
            value: z.string()
          })
        )
        .optional(),
      // Parsed convenience fields
      answerVi: z.string().optional(),
      answerEn: z.string().optional()
    }),
    message: z.string()
  })
  .strict()

export const AnswerListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(AnswerWithTranslationType),
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

// Response schema for multiple answers creation
export const CreateMultipleAnswersResponseSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      created: z.array(AnswerType),
      updated: z.array(AnswerType),
      failed: z.array(
        z.object({
          answerJp: z.string(),
          reason: z.string()
        })
      ),
      summary: z.object({
        total: z.number(),
        created: z.number(),
        updated: z.number(),
        failed: z.number()
      })
    }),
    message: z.string()
  })
  .strict()

// Type exports
export type AnswerType = z.infer<typeof AnswerType>
export type AnswerWithTranslationType = z.infer<typeof AnswerWithTranslationType>
export type CreateAnswerBodyType = z.infer<typeof CreateAnswerBodyType>
export type CreateMultipleAnswersBodyType = z.infer<typeof CreateMultipleAnswersBodyType>
export type UpdateAnswerBodyType = z.infer<typeof UpdateAnswerBodyType>
export type GetAnswerByIdParamsType = z.infer<typeof GetAnswerByIdParamsType>
export type GetAnswerListQueryType = z.infer<typeof GetAnswerListQueryType>
export type AnswerResponseType = z.infer<typeof AnswerResponseSchema>
export type AnswerListResType = z.infer<typeof AnswerListResSchema>
export type CreateMultipleAnswersResponseType = z.infer<
  typeof CreateMultipleAnswersResponseSchema
>
