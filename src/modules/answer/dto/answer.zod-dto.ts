import { AnswerSortField, SortOrder } from '@/common/enum/enum'
import { checkIdSchema } from '@/common/utils/id.validation'
import { AnswerMessage } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { AnswerSchema, AnswerWithTranslationSchema } from '../entities/answer.entity'

// Request/Response Types

export const CreateAnswerBodySchema = z.object({
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

export type CreateAnswerBody = z.infer<typeof CreateAnswerBodySchema>

export class CreateAnswerBodyDTO extends createZodDto(CreateAnswerBodySchema) {}

// Schema for creating multiple answers

export const CreateMultipleAnswersBodySchema = z.object({
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

export type CreateMultipleAnswersBody = z.infer<typeof CreateMultipleAnswersBodySchema>

export class CreateMultipleAnswersBodyDTO extends createZodDto(
  CreateMultipleAnswersBodySchema
) {}

export const UpdateAnswerBodySchema = z.object({
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

export type UpdateAnswerBody = z.infer<typeof UpdateAnswerBodySchema>

export class UpdateAnswerBodyDTO extends createZodDto(UpdateAnswerBodySchema) {}

export const GetAnswerByIdParamsSchema = z.object({
  id: checkIdSchema(AnswerMessage.INVALID_ID)
})

export type GetAnswerByIdParams = z.infer<typeof GetAnswerByIdParamsSchema>

export class GetAnswerByIdParamsDTO extends createZodDto(GetAnswerByIdParamsSchema) {}

export const GetAnswerListQuerySchema = z.object({
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

export type GetAnswerListQuery = z.infer<typeof GetAnswerListQuerySchema>

export class GetAnswerListQueryDTO extends createZodDto(GetAnswerListQuerySchema) {}

// Response schemas

export const AnswerResponseSchema = resSchema(
  AnswerSchema.omit({ answerKey: true }).extend({
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
  })
).strict()

export type AnswerResponse = z.infer<typeof AnswerResponseSchema>

export class AnswerResponseDTO extends createZodDto(AnswerResponseSchema) {}

export const AnswerListResSchema = paginatedResSchema(
  AnswerWithTranslationSchema
).strict()

export type AnswerListRes = z.infer<typeof AnswerListResSchema>

export class AnswerListResDTO extends createZodDto(AnswerListResSchema) {}

// Response schema for multiple answers creation

export const CreateMultipleAnswersResponseSchema = resSchema(
  z.object({
    created: z.array(AnswerSchema),
    updated: z.array(AnswerSchema),
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
  })
).strict()

export type CreateMultipleAnswersResponse = z.infer<
  typeof CreateMultipleAnswersResponseSchema
>

export class CreateMultipleAnswersResponseDTO extends createZodDto(
  CreateMultipleAnswersResponseSchema
) {}
