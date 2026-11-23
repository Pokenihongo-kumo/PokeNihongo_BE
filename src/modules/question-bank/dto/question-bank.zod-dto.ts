import { PaginationMetaSchema } from '@/shared/models/response.model'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { checkIdSchema } from '@/common/utils/id.validation'
import { isUrl } from '@/common/utils/is-url'
import { QuestionBankMessage as M } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { QuestionType, RoleSpeaking } from '@prisma/client'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  isQuestionText,
  lacksPronunciation,
  QuestionBankSchema
} from '../entities/question-bank.entity'

export const enumOf = <T extends Record<string, string>>(values: T, key: string) =>
  z.nativeEnum(values, { errorMap: () => ({ message: key }) })

export type Ctx = z.RefinementCtx

export const issue = (ctx: Ctx, message: string, path: (string | number)[]) =>
  ctx.addIssue({ code: z.ZodIssueCode.custom, message, path })

// Field rules shared by create and update (were checked in the service)
const fields = {
  questionJp: z
    .string({
      required_error: M.QUESTION_JP_REQUIRED,
      invalid_type_error: M.QUESTION_JP_REQUIRED
    })
    .min(1, M.QUESTION_JP_REQUIRED)
    .refine(isQuestionText, M.QUESTION_JP_NOT_JAPANESE),
  questionType: enumOf(QuestionType, M.INVALID_QUESTION_TYPE),
  // '' means "no audio" (LISTENING/SPEAKING then get generated speech)
  audioUrl: z
    .string()
    .refine((v) => !v.trim() || isUrl(v), M.INVALID_AUDIO_URL)
    .nullable()
    .optional(),
  questionKey: z.string().nullable().optional(),
  role: enumOf(RoleSpeaking, M.INVALID_ROLE).nullable().optional(),
  pronunciation: z.string().nullable().optional(),
  levelN: z
    .number({ invalid_type_error: M.INVALID_LEVEL })
    .int(M.INVALID_LEVEL)
    .min(1, M.INVALID_LEVEL)
    .max(5, M.INVALID_LEVEL)
    .nullable()
    .optional(),
  // Meaning i is saved as {questionKey}.meaning.{i}; meaningKey is ignored
  meanings: z
    .array(
      z.object({
        meaningKey: z.string().nullable().optional(),
        translations: z.record(z.string())
      })
    )
    .optional()
}

const pronunciationRule = (data: Parameters<typeof lacksPronunciation>[0], ctx: Ctx) => {
  if (lacksPronunciation(data)) issue(ctx, M.PRONUNCIATION_REQUIRED, ['pronunciation'])
}

export const GetQuestionBankByIdParamsSchema = z
  .object({
    id: checkIdSchema(M.INVALID_ID)
  })
  .strict()

export type GetQuestionBankByIdParams = z.infer<typeof GetQuestionBankByIdParamsSchema>

export class GetQuestionBankByIdParamsDTO extends createZodDto(
  GetQuestionBankByIdParamsSchema
) {}

export const QuestionBankResSchema = resSchema(QuestionBankSchema).strict()

export type QuestionBankRes = z.infer<typeof QuestionBankResSchema>

export class QuestionBankResDTO extends createZodDto(QuestionBankResSchema) {}

// Bulk delete schema

export const BulkDeleteQuestionBankBodySchema = z
  .object({
    ids: z
      .array(
        z
          .number({ invalid_type_error: M.INVALID_ID })
          .int(M.INVALID_ID)
          .positive(M.INVALID_ID),
        { required_error: M.IDS_REQUIRED, invalid_type_error: M.IDS_REQUIRED }
      )
      .min(1, M.IDS_REQUIRED)
      .max(100, M.IDS_TOO_MANY)
  })
  .strict()

export type BulkDeleteQuestionBankBody = z.infer<typeof BulkDeleteQuestionBankBodySchema>

export class BulkDeleteQuestionBankBodyDTO extends createZodDto(
  BulkDeleteQuestionBankBodySchema
) {}

export const GetQuestionBankListQuerySchema = z
  .object({
    currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).default(10),
    levelN: z.coerce
      .number({ invalid_type_error: M.INVALID_LEVEL })
      .int(M.INVALID_LEVEL)
      .min(1, M.INVALID_LEVEL)
      .max(5, M.INVALID_LEVEL)
      .optional(),
    questionType: enumOf(QuestionType, M.INVALID_QUESTION_TYPE).optional(),
    search: z.string().optional(),
    sortBy: z
      .enum(['id', 'questionJp', 'questionType', 'levelN', 'createdAt', 'updatedAt'])
      .optional()
      .default('createdAt'),
    sort: z.enum(['asc', 'desc']).optional().default('desc'),
    // With it, `meaning` is one string in that language; without, `meanings`
    language: z.string().optional(),
    // Leaves out the questions already in this test set
    testSetId: checkIdSchema(M.INVALID_TEST_SET_ID).optional(),
    // Only questions not in any test set
    noTestSet: z
      .string()
      .optional()
      .transform((val) => val === 'true')
  })
  .strict()

export type GetQuestionBankListQuery = z.infer<typeof GetQuestionBankListQuerySchema>

export class GetQuestionBankListQueryDTO extends createZodDto(
  GetQuestionBankListQuerySchema
) {}

// questionIds=1,2,3 or questionIds=1&questionIds=2 (non-numbers are dropped)

export const GetQuestionBanksByIdsQuerySchema = z
  .object({
    questionIds: z.preprocess(
      (val) => {
        const values: unknown[] = Array.isArray(val) ? val : [val]
        return values
          .flatMap((v): (string | number)[] =>
            typeof v === 'string' ? v.split(',') : typeof v === 'number' ? [v] : []
          )
          .map((id) => (typeof id === 'number' ? id : parseInt(id.trim(), 10)))
          .filter((id) => !isNaN(id))
      },
      z
        .array(z.number().int().positive())
        .min(1, M.QUESTION_IDS_REQUIRED)
        .max(100, M.QUESTION_IDS_TOO_MANY)
    )
  })
  .strict()

export type GetQuestionBanksByIdsQuery = z.infer<typeof GetQuestionBanksByIdsQuerySchema>

export class GetQuestionBanksByIdsQueryDTO extends createZodDto(
  GetQuestionBanksByIdsQuerySchema
) {}

// Schema for creating question bank with meanings

export const CreateQuestionBankWithMeaningsBodySchema = z
  .object(fields)
  .strict()
  .superRefine(pronunciationRule)

export type CreateQuestionBankWithMeaningsBody = z.infer<
  typeof CreateQuestionBankWithMeaningsBodySchema
>

// Every field optional; the SPEAKING rule applies when questionType is sent

export const UpdateQuestionBankWithMeaningsBodySchema = z
  .object({
    ...fields,
    questionJp: fields.questionJp.optional(),
    questionType: fields.questionType.optional()
  })
  .strict()
  .superRefine(pronunciationRule)

export type UpdateQuestionBankWithMeaningsBody = z.infer<
  typeof UpdateQuestionBankWithMeaningsBodySchema
>

export class UpdateQuestionBankWithMeaningsBodyDTO extends createZodDto(
  UpdateQuestionBankWithMeaningsBodySchema
) {}

const answerTranslations = z.object({ language_code: z.string(), value: z.string() })

// MATCHING: exactly one answer, correct. Others: up to 4, exactly one correct

export const CreateQuestionBankWithAnswersBodySchema = z
  .object({
    ...fields,
    answers: z
      .array(
        z.object({
          answerJp: z.string(),
          isCorrect: z.boolean(),
          translations: z
            .union([
              // Format 1: Simple object with language_code and value
              answerTranslations,
              // Format 2: Complex object with meaning array
              z.object({ meaning: z.array(answerTranslations) })
            ])
            .optional()
        }),
        { required_error: M.ANSWERS_REQUIRED }
      )
      .min(1, M.ANSWERS_REQUIRED)
      .max(4, M.ANSWERS_TOO_MANY)
  })
  .strict()
  .superRefine((data, ctx) => {
    pronunciationRule(data, ctx)
    if (!Array.isArray(data.answers) || data.answers.length === 0) return
    const correct = data.answers.filter((a) => a.isCorrect).length
    if (data.questionType === QuestionType.MATCHING) {
      if (data.answers.length !== 1) issue(ctx, M.MATCHING_SINGLE_ANSWER, ['answers'])
      else if (correct === 0) issue(ctx, M.MATCHING_MUST_BE_CORRECT, ['answers'])
    } else if (correct === 0) {
      issue(ctx, M.CORRECT_ANSWER_REQUIRED, ['answers'])
    } else if (correct > 1) {
      issue(ctx, M.ONLY_ONE_CORRECT_ANSWER, ['answers'])
    }
  })

export type CreateQuestionBankWithAnswersBody = z.infer<
  typeof CreateQuestionBankWithAnswersBodySchema
>

export class CreateQuestionBankWithAnswersBodyDTO extends createZodDto(
  CreateQuestionBankWithAnswersBodySchema
) {}

// ---- responses (output only)

// A question bank row as stored (createdById is left out by some reads)
export const QuestionBankRowOutSchema = z.object({
  id: z.number(),
  questionJp: z.string().nullable(),
  questionType: z.string(),
  audioUrl: z.string().nullable(),
  questionKey: z.string().nullable(),
  role: z.string().nullable(),
  pronunciation: z.string().nullable(),
  levelN: z.number().nullable(),
  createdById: z.number().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const QuestionBankRowResSchema = resSchema(QuestionBankRowOutSchema)

export type QuestionBankRowRes = z.infer<typeof QuestionBankRowResSchema>

export class QuestionBankRowResDTO extends createZodDto(QuestionBankRowResSchema) {}

// List: each row with its meanings, plus how many questions each level has
export const QuestionBankListResSchema = resSchema(
  z.object({
    results: z.array(
      QuestionBankRowOutSchema.extend({
        meanings: z.array(z.object({ language: z.string(), value: z.string() }))
      })
    ),
    pagination: PaginationMetaSchema,
    levelCounts: z.record(z.string(), z.number())
  })
)

export type QuestionBankListRes = z.infer<typeof QuestionBankListResSchema>

export class QuestionBankListResDTO extends createZodDto(QuestionBankListResSchema) {}

// By ids: the question text in the request language and the answer labels
export const QuestionBanksByIdsResSchema = paginatedResSchema(
  z.object({
    id: z.number(),
    question: z.string().nullable(),
    questionType: z.string(),
    audioUrl: z.string().nullable(),
    pronunciation: z.string().nullable(),
    levelN: z.number().nullable(),
    answers: z.array(z.object({ id: z.number(), answer: z.string().nullable() }))
  })
)

export type QuestionBanksByIdsRes = z.infer<typeof QuestionBanksByIdsResSchema>

export class QuestionBanksByIdsResDTO extends createZodDto(QuestionBanksByIdsResSchema) {}

export const QuestionBankBulkDeleteResSchema = resSchema(
  z.object({
    deletedCount: z.number(),
    deletedIds: z.array(z.number()),
    requestedCount: z.number(),
    notFoundCount: z.number()
  })
)

export type QuestionBankBulkDeleteRes = z.infer<typeof QuestionBankBulkDeleteResSchema>

export class QuestionBankBulkDeleteResDTO extends createZodDto(
  QuestionBankBulkDeleteResSchema
) {}
