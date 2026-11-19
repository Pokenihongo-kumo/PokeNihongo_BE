import { checkIdSchema } from '@/common/utils/id.validation'
import { isUrl } from '@/common/utils/is-url'
import { hasJapaneseText } from '@/common/utils/japanese-text'
import { TestSetMessage as M } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import {
  TestSetType as PrismaTestSetType,
  QuestionType,
  RoleSpeaking,
  TestSetStatus
} from '@prisma/client'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { TestSetSchema } from '../entities/testset.entity'

export const enumOf = <T extends Record<string, string>>(values: T, key: string) =>
  z.nativeEnum(values, { errorMap: () => ({ message: key }) })

// Field rules shared by every create/update body (were checked in the service)
export const fields = {
  content: z.string().nullable().optional(),
  // '' means "no audio"
  audioUrl: z
    .string()
    .refine((v) => v === '' || isUrl(v), M.INVALID_AUDIO_URL)
    .nullable()
    .optional(),
  price: z
    .number({ invalid_type_error: M.INVALID_PRICE })
    .min(0, M.INVALID_PRICE)
    .nullable()
    .optional(),
  // 0 = several levels
  levelN: z
    .number({ invalid_type_error: M.INVALID_LEVEL })
    .int(M.INVALID_LEVEL)
    .min(0, M.INVALID_LEVEL)
    .max(5, M.INVALID_LEVEL)
    .nullable()
    .optional(),
  testType: enumOf(PrismaTestSetType, M.INVALID_TEST_TYPE),
  status: enumOf(TestSetStatus, M.INVALID_STATUS)
}

type Ctx = z.RefinementCtx

export const issue = (ctx: Ctx, message: string, path: (string | number)[]) =>
  ctx.addIssue({ code: z.ZodIssueCode.custom, message, path })

// A READING test set carries its reading text, in Japanese
export const readingNeedsContent = (
  data: { testType?: PrismaTestSetType; content?: string | null },
  ctx: Ctx
) => {
  if (data.testType === PrismaTestSetType.READING && !hasJapaneseText(data.content)) {
    issue(ctx, M.READING_CONTENT_REQUIRED, ['content'])
  }
}

export const nameIsTranslated = (
  items: { field: 'name' | 'description' }[] | undefined,
  key: string,
  path: string,
  ctx: Ctx
) => {
  if (items && !items.some((item) => item.field === 'name')) issue(ctx, key, [path])
}

const fieldEnum = z.enum(['name', 'description'])

export const MeaningSchema = z.object({
  field: fieldEnum,
  meaningKey: z.string().optional(),
  translations: z.object({ vi: z.string(), en: z.string(), ja: z.string().optional() })
})

export const MeaningsSchema = z
  .array(MeaningSchema, { required_error: M.MEANINGS_REQUIRED })
  .min(1, M.MEANINGS_REQUIRED)

export const TranslationsSchema = z
  .array(z.object({ field: fieldEnum, language_code: z.string(), value: z.string() }), {
    required_error: M.TRANSLATIONS_REQUIRED
  })
  .min(1, M.TRANSLATIONS_REQUIRED)

// Create TestSet with Meanings Schema

export const CreateTestSetWithMeaningsBodySchema = z
  .object({
    ...fields,
    status: fields.status.default(TestSetStatus.DRAFT),
    meanings: MeaningsSchema
  })
  .strict()
  .superRefine((data, ctx) => {
    readingNeedsContent(data, ctx)
    nameIsTranslated(data.meanings, M.NAME_MEANING_REQUIRED, 'meanings', ctx)
  })

export type CreateTestSetWithMeaningsBody = z.infer<
  typeof CreateTestSetWithMeaningsBodySchema
>

// Create TestSet with Meanings DTO
export class CreateTestSetWithMeaningsBodyDTO extends createZodDto(
  CreateTestSetWithMeaningsBodySchema
) {}

// Update TestSet Schema (translations are written as the first meaning)

export const UpdateTestSetBodySchema = z
  .object({
    ...fields,
    testType: fields.testType.optional(),
    status: fields.status.optional(),
    translations: TranslationsSchema.optional()
  })
  .strict()
  .superRefine((data, ctx) => {
    readingNeedsContent(data, ctx)
    nameIsTranslated(data.translations, M.NAME_TRANSLATION_REQUIRED, 'translations', ctx)
  })

export type UpdateTestSetBody = z.infer<typeof UpdateTestSetBodySchema>

// Update TestSet DTO
export class UpdateTestSetBodyDTO extends createZodDto(UpdateTestSetBodySchema) {}

// Update TestSet with Meanings Schema

export const UpdateTestSetWithMeaningsBodySchema = z
  .object({
    ...fields,
    testType: fields.testType.optional(),
    status: fields.status.optional(),
    meanings: MeaningsSchema.optional()
  })
  .strict()
  .superRefine((data, ctx) => {
    readingNeedsContent(data, ctx)
    nameIsTranslated(data.meanings, M.NAME_MEANING_REQUIRED, 'meanings', ctx)
  })

export type UpdateTestSetWithMeaningsBody = z.infer<
  typeof UpdateTestSetWithMeaningsBodySchema
>

// Update TestSet with Meanings DTO
export class UpdateTestSetWithMeaningsBodyDTO extends createZodDto(
  UpdateTestSetWithMeaningsBodySchema
) {}

// A question in the upsert: with `id` an existing one (a TestSetQuestionBank id
// of this test set, else a QuestionBank id), without `id` a new QuestionBank

export const UpsertQuestionBankSchema = z
  .object({
    id: z.number().int().positive().optional(),
    questionJp: z
      .string({ required_error: M.QUESTION_JP_REQUIRED })
      .min(1, M.QUESTION_JP_REQUIRED)
      .refine(hasJapaneseText, M.QUESTION_JP_NOT_JAPANESE),
    questionType: enumOf(QuestionType, M.INVALID_QUESTION_TYPE),
    audioUrl: z.string().nullable().optional(),
    pronunciation: z.string().nullable().optional(),
    role: z.nativeEnum(RoleSpeaking).nullable().optional(),
    levelN: z
      .number({ invalid_type_error: M.INVALID_QUESTION_LEVEL })
      .int(M.INVALID_QUESTION_LEVEL)
      .min(1, M.INVALID_QUESTION_LEVEL)
      .max(5, M.INVALID_QUESTION_LEVEL)
      .nullable()
      .optional(),
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

export type UpsertQuestionBank = z.infer<typeof UpsertQuestionBankSchema>

// Upsert: create without `id` (testType, meanings and questions required),
// update with `id`. Question order = position in the array

export const UpsertTestSetWithQuestionBanksBodySchema = z
  .object({
    id: z.number().int().positive().optional(),
    ...fields,
    testType: fields.testType.optional(),
    status: fields.status.optional(),
    meanings: z
      .array(
        MeaningSchema.extend({
          translations: z.object({
            vi: z.string().optional(),
            en: z.string().optional(),
            ja: z.string().optional()
          })
        })
      )
      .min(1, M.MEANINGS_REQUIRED)
      .optional(),
    questionBanks: z.array(UpsertQuestionBankSchema).optional()
  })
  .strict()
  .superRefine((data, ctx) => {
    readingNeedsContent(data, ctx)
    nameIsTranslated(data.meanings, M.NAME_MEANING_REQUIRED, 'meanings', ctx)
    if (!data.id) {
      if (!data.testType) issue(ctx, M.TEST_TYPE_REQUIRED, ['testType'])
      if (!data.meanings) issue(ctx, M.MEANINGS_REQUIRED, ['meanings'])
      if (!data.questionBanks?.length)
        issue(ctx, M.QUESTION_BANKS_REQUIRED, ['questionBanks'])
    }
    const ids = (data.questionBanks ?? []).flatMap((q) => (q.id ? [q.id] : []))
    if (new Set(ids).size !== ids.length) {
      issue(ctx, M.DUPLICATE_QUESTION_IDS, ['questionBanks'])
    }
  })

export type UpsertTestSetWithQuestionBanksBody = z.infer<
  typeof UpsertTestSetWithQuestionBanksBodySchema
>

// Upsert TestSet with QuestionBanks DTO (gộp create và update)
export class UpsertTestSetWithQuestionBanksBodyDTO extends createZodDto(
  UpsertTestSetWithQuestionBanksBodySchema
) {}

// TestSet List Response Schema

export const TestSetListResSchema = paginatedResSchema(TestSetSchema)

export type TestSetListRes = z.infer<typeof TestSetListResSchema>

// TestSet List Response DTO
export class TestSetListResDTO extends createZodDto(TestSetListResSchema) {}

// Get TestSet by ID Params Schema

export const GetTestSetByIdParamsSchema = z
  .object({
    id: checkIdSchema(M.INVALID_ID)
  })
  .strict()

export type GetTestSetByIdParams = z.infer<typeof GetTestSetByIdParamsSchema>

// Get TestSet by ID Params DTO
export class GetTestSetByIdParamsDTO extends createZodDto(GetTestSetByIdParamsSchema) {}

const flag = z
  .string()
  .optional()
  .transform((val) => val === 'true')

// Get TestSet List Query Schema

export const GetTestSetListQuerySchema = z
  .object({
    currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).default(10),
    // Matches the name/description translations and the content
    search: z.string().optional(),
    levelN: z.coerce
      .number({ invalid_type_error: M.INVALID_LEVEL })
      .int(M.INVALID_LEVEL)
      .min(0, M.INVALID_LEVEL)
      .max(5, M.INVALID_LEVEL)
      .optional(),
    testType: enumOf(PrismaTestSetType, M.INVALID_TEST_TYPE).optional(),
    status: enumOf(TestSetStatus, M.INVALID_STATUS).optional(),
    creatorId: checkIdSchema(M.INVALID_CREATOR_ID).optional(),
    // Without it, name/description are every translation; with it, one string
    language: z.string().optional(),
    sortBy: z
      .enum([
        'id',
        'name',
        'testType',
        'levelN',
        'status',
        'price',
        'createdAt',
        'updatedAt'
      ])
      .optional()
      .default('createdAt'),
    sort: z.enum(['asc', 'desc']).optional().default('desc'),
    noExercies: flag,
    noPrice: flag
  })
  .strict()

export type GetTestSetListQuery = z.infer<typeof GetTestSetListQuerySchema>

// Get TestSet List Query DTO
export class GetTestSetListQueryDTO extends createZodDto(GetTestSetListQuerySchema) {}
