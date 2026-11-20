import { checkIdSchema } from '@/common/utils/id.validation'
import { TestMessage as M } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { TestStatus as PrismaTestStatus, TestSetStatus } from '@prisma/client'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { TestSchema } from '../entities/test.entity'

export const enumOf = <T extends Record<string, string>>(values: T, key: string) =>
  z.nativeEnum(values, { errorMap: () => ({ message: key }) })

// Body ids are JSON numbers (no coercion); params and query use checkIdSchema
export const idOf = (key: string) =>
  z.number({ invalid_type_error: key, required_error: key }).int(key).positive(key)

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

export type CreateTestWithMeaningsBody = z.infer<typeof CreateTestWithMeaningsBodySchema>

// Bodies
export class CreateTestWithMeaningsBodyDTO extends createZodDto(
  CreateTestWithMeaningsBodySchema
) {}

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

export type UpdateTestWithMeaningsBody = z.infer<typeof UpdateTestWithMeaningsBodySchema>

export class UpdateTestWithMeaningsBodyDTO extends createZodDto(
  UpdateTestWithMeaningsBodySchema
) {}

// Test List Response Schema

export const TestListResSchema = paginatedResSchema(TestSchema)

// Test List Response DTO
export class TestListResDTO extends createZodDto(TestListResSchema) {}

// Get Test by ID Params Schema

export const GetTestByIdParamsSchema = z
  .object({
    id: checkIdSchema(M.INVALID_ID)
  })
  .strict()

// Params and queries
export class GetTestByIdParamsDTO extends createZodDto(GetTestByIdParamsSchema) {}

export const GetTestByLessonParamsSchema = z
  .object({
    lessonId: checkIdSchema(M.INVALID_LESSON_ID)
  })
  .strict()

export class GetTestByLessonParamsDTO extends createZodDto(GetTestByLessonParamsSchema) {}

export const GetLessonReviewParamsSchema = z
  .object({
    testId: checkIdSchema(M.INVALID_ID)
  })
  .strict()

export class GetLessonReviewParamsDTO extends createZodDto(GetLessonReviewParamsSchema) {}

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

export class GetRandomQuestionsQueryDTO extends createZodDto(
  GetRandomQuestionsQuerySchema
) {}

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

export type GetTestListQuery = z.infer<typeof GetTestListQuerySchema>

export class GetTestListQueryDTO extends createZodDto(GetTestListQuerySchema) {}

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

export type DeleteManyTestsBody = z.infer<typeof DeleteManyTestsBodySchema>

export class DeleteManyTestsBodyDTO extends createZodDto(DeleteManyTestsBodySchema) {}

// Add TestSets to Test Schema

export const AddTestSetsToTestBodySchema = z.object({ testSetIds }).strict()

export type AddTestSetsToTestBody = z.infer<typeof AddTestSetsToTestBodySchema>

export class AddTestSetsToTestBodyDTO extends createZodDto(AddTestSetsToTestBodySchema) {}

// Remove TestSets from Test Schema

export const RemoveTestSetsFromTestBodySchema = z.object({ testSetIds }).strict()

export type RemoveTestSetsFromTestBody = z.infer<typeof RemoveTestSetsFromTestBodySchema>

export class RemoveTestSetsFromTestBodyDTO extends createZodDto(
  RemoveTestSetsFromTestBodySchema
) {}
