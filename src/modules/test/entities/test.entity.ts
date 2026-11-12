import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { TestSetStatus, TestStatus as PrismaTestStatus } from '@prisma/client'
import { TestMessage as M } from '@/i18n/message-keys'
import { checkIdSchema } from '@/common/utils/id.validation'
import { paginatedResSchema } from '@/shared/utils/pagination'

extendZodWithOpenApi(z)
patchNestJsSwagger()

const enumOf = <T extends Record<string, string>>(values: T, key: string) =>
  z.nativeEnum(values, { errorMap: () => ({ message: key }) })

// Body ids are JSON numbers (no coercion); params and query use checkIdSchema
const idOf = (key: string) =>
  z.number({ invalid_type_error: key, required_error: key }).int(key).positive(key)

// Test Schema
export const TestSchema = z.object({
  id: z.number(),
  name: z.union([
    z.string(),
    z.array(
      z.object({
        language: z.string(),
        value: z.string()
      })
    )
  ]),
  description: z
    .union([
      z.string().nullable(),
      z.array(
        z.object({
          language: z.string(),
          value: z.string()
        })
      )
    ])
    .optional(),
  price: z.number().nullable().optional(),
  levelN: z.number().int().min(0).max(5).nullable().optional(),
  limit: z.number().int().min(0).nullable().optional(),
  testType: z.nativeEnum(PrismaTestStatus),
  status: z.nativeEnum(TestSetStatus),
  creatorId: z.number().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Field rules shared by create and update (were checked in the service)
const fields = {
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
  // Attempts allowed (0 = no limit)
  limit: z
    .number({ invalid_type_error: M.INVALID_LIMIT })
    .int(M.INVALID_LIMIT)
    .min(0, M.INVALID_LIMIT)
    .nullable()
    .optional(),
  testType: enumOf(PrismaTestStatus, M.INVALID_TEST_TYPE),
  status: enumOf(TestSetStatus, M.INVALID_STATUS)
}

const MeaningsSchema = z
  .array(
    z.object({
      field: z.enum(['name', 'description']),
      meaningKey: z.string().optional(),
      translations: z.object({
        vi: z.string(),
        en: z.string(),
        ja: z.string().optional()
      })
    }),
    { required_error: M.MEANINGS_REQUIRED }
  )
  .min(1, M.MEANINGS_REQUIRED)

// Meanings, when sent, include the name
const nameMeaning = (
  data: { meanings?: { field: 'name' | 'description' }[] },
  ctx: z.RefinementCtx
) => {
  if (data.meanings && !data.meanings.some((m) => m.field === 'name')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: M.NAME_MEANING_REQUIRED,
      path: ['meanings']
    })
  }
}

// Create Test with Meanings Schema
export const CreateTestWithMeaningsBodySchema = z
  .object({
    ...fields,
    status: fields.status.default(TestSetStatus.DRAFT),
    meanings: MeaningsSchema
  })
  .strict()
  .superRefine(nameMeaning)

// Update Test with Meanings Schema
export const UpdateTestWithMeaningsBodySchema = z
  .object({
    ...fields,
    testType: fields.testType.optional(),
    status: fields.status.optional(),
    meanings: MeaningsSchema.optional()
  })
  .strict()
  .superRefine(nameMeaning)

// Test List Response Schema
export const TestListResSchema = paginatedResSchema(TestSchema)

// Get Test by ID Params Schema
export const GetTestByIdParamsSchema = z
  .object({
    id: checkIdSchema(M.INVALID_ID)
  })
  .strict()

export const GetTestByLessonParamsSchema = z
  .object({
    lessonId: checkIdSchema(M.INVALID_LESSON_ID)
  })
  .strict()

export const GetLessonReviewParamsSchema = z
  .object({
    testId: checkIdSchema(M.INVALID_ID)
  })
  .strict()

// levelN 1-5 and how many questions
export const GetRandomQuestionsQuerySchema = z
  .object({
    levelN: z.coerce
      .number({ invalid_type_error: M.INVALID_LEVEL_N })
      .int(M.INVALID_LEVEL_N)
      .min(1, M.INVALID_LEVEL_N)
      .max(5, M.INVALID_LEVEL_N),
    count: checkIdSchema(M.INVALID_COUNT)
  })
  .strict()

// Get Test List Query Schema
export const GetTestListQuerySchema = z
  .object({
    currentPage: checkIdSchema(M.INVALID_PAGE).default(1),
    pageSize: checkIdSchema(M.INVALID_PAGE_SIZE).default(10),
    search: z.string().optional(),
    testType: enumOf(PrismaTestStatus, M.INVALID_TEST_TYPE).optional(),
    status: enumOf(TestSetStatus, M.INVALID_STATUS).optional(),
    levelN: z.coerce
      .number({ invalid_type_error: M.INVALID_LEVEL })
      .int(M.INVALID_LEVEL)
      .min(0, M.INVALID_LEVEL)
      .max(5, M.INVALID_LEVEL)
      .optional(),
    creatorId: checkIdSchema(M.INVALID_CREATOR_ID).optional(),
    language: z.string().optional(),
    sortBy: z
      .enum([
        'id',
        'name',
        'testType',
        'status',
        'price',
        'levelN',
        'createdAt',
        'updatedAt'
      ])
      .optional()
      .default('createdAt'),
    sort: z.enum(['asc', 'desc']).optional().default('desc')
  })
  .strict()

const testSetIds = z
  .array(idOf(M.INVALID_TESTSET_ID), {
    required_error: M.TESTSET_IDS_REQUIRED,
    invalid_type_error: M.TESTSET_IDS_REQUIRED
  })
  .min(1, M.TESTSET_IDS_REQUIRED)

// Delete Many Tests Schema
export const DeleteManyTestsBodySchema = z
  .object({
    ids: z
      .array(idOf(M.INVALID_ID), {
        required_error: M.IDS_REQUIRED,
        invalid_type_error: M.IDS_REQUIRED
      })
      .min(1, M.IDS_REQUIRED)
      .max(100, M.IDS_TOO_MANY)
  })
  .strict()

// Add TestSets to Test Schema
export const AddTestSetsToTestBodySchema = z.object({ testSetIds }).strict()

// Remove TestSets from Test Schema
export const RemoveTestSetsFromTestBodySchema = z.object({ testSetIds }).strict()

// Types
export type TestType = z.infer<typeof TestSchema>
export type CreateTestWithMeaningsBodyType = z.infer<
  typeof CreateTestWithMeaningsBodySchema
>
export type UpdateTestWithMeaningsBodyType = z.infer<
  typeof UpdateTestWithMeaningsBodySchema
>
export type TestListResType = z.infer<typeof TestListResSchema>
export type GetTestByIdParamsType = z.infer<typeof GetTestByIdParamsSchema>
export type GetTestListQueryType = z.infer<typeof GetTestListQuerySchema>
export type DeleteManyTestsBodyType = z.infer<typeof DeleteManyTestsBodySchema>
export type AddTestSetsToTestBodyType = z.infer<typeof AddTestSetsToTestBodySchema>
export type RemoveTestSetsFromTestBodyType = z.infer<
  typeof RemoveTestSetsFromTestBodySchema
>
