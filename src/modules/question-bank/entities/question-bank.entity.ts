import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { QuestionType, RoleSpeaking } from '@prisma/client'
import { QuestionBankMessage as M } from '@/i18n/message-keys'
import { checkIdSchema } from '@/common/utils/id.validation'
import { hasJapaneseText } from '@/common/utils/japanese-text'
import { isUrl } from '@/common/utils/is-url'

extendZodWithOpenApi(z)
patchNestJsSwagger()

const enumOf = <T extends Record<string, string>>(values: T, key: string) =>
  z.nativeEnum(values, { errorMap: () => ({ message: key }) })

type Ctx = z.RefinementCtx
const issue = (ctx: Ctx, message: string, path: (string | number)[]) =>
  ctx.addIssue({ code: z.ZodIssueCode.custom, message, path })

// Japanese text, or a blank to fill in (_ or the full-width ＿)
export const isQuestionText = (text: string) =>
  hasJapaneseText(text) || text.includes('_') || text.includes('＿')

// A SPEAKING question is read aloud: it needs its romaji pronunciation
export const lacksPronunciation = (data: {
  questionType?: QuestionType
  pronunciation?: string | null
}) => data.questionType === QuestionType.SPEAKING && !data.pronunciation?.trim()

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

export const QuestionBankResSchema = z
  .object({
    statusCode: z.number(),
    data: QuestionBankSchema,
    message: z.string()
  })
  .strict()

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

// Schema for creating question bank with meanings
export const CreateQuestionBankWithMeaningsBodySchema = z
  .object(fields)
  .strict()
  .superRefine(pronunciationRule)

// Every field optional; the SPEAKING rule applies when questionType is sent
export const UpdateQuestionBankWithMeaningsBodySchema = z
  .object({
    ...fields,
    questionJp: fields.questionJp.optional(),
    questionType: fields.questionType.optional()
  })
  .strict()
  .superRefine(pronunciationRule)

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

// Types
export type QuestionBankType = z.infer<typeof QuestionBankSchema>
export type QuestionBankResType = z.infer<typeof QuestionBankResSchema>
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
export type BulkDeleteQuestionBankBodyType = z.infer<
  typeof BulkDeleteQuestionBankBodySchema
>
