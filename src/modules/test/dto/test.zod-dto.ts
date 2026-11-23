import {
  AnswerLabelOutSchema,
  QuestionWithAnswersOutSchema
} from '@/modules/testset-questionbank/dto/testset-questionbank.zod-dto'
import { TestSetRowOutSchema } from '@/modules/testset/dto/testset.zod-dto'
import { decimalOutSchema, translatedTextOutSchema } from '@/shared/utils/output-schema'
import { resSchema } from '@/shared/utils/res-schema'
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

// ---- responses (output only)

const TestFieldsOutSchema = z.object({
  id: z.number(),
  name: translatedTextOutSchema,
  description: translatedTextOutSchema.nullable().optional(),
  price: decimalOutSchema.nullable(),
  levelN: z.number().nullable(),
  limit: z.number().nullable(),
  testType: z.string(),
  status: z.string()
})

// A test row; its test sets when the read includes them
export const TestRowOutSchema = TestFieldsOutSchema.extend({
  creatorId: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  testSets: z.array(TestSetRowOutSchema).optional()
})

export const TestRowResSchema = resSchema(TestRowOutSchema)

export class TestRowResDTO extends createZodDto(TestRowResSchema) {}

const TestSetWithQuestionsFieldsSchema = z.object({
  id: z.number(),
  name: translatedTextOutSchema,
  description: translatedTextOutSchema.nullable(),
  content: translatedTextOutSchema.nullable(),
  audioUrl: z.string().nullable(),
  price: decimalOutSchema.nullable(),
  levelN: z.number().nullable(),
  testType: z.string(),
  status: z.string(),
  questions: z.array(QuestionWithAnswersOutSchema)
})

// Full (admin): each test set with its creator and questions
export const TestFullResSchema = resSchema(
  TestFieldsOutSchema.extend({
    creatorId: z.number().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    testSets: z.array(
      TestSetWithQuestionsFieldsSchema.extend({
        creator: z
          .object({ id: z.number(), name: z.string(), email: z.string() })
          .nullable()
      })
    )
  })
)

export class TestFullResDTO extends createZodDto(TestFullResSchema) {}

// Full (user): the same without creator and audit fields
export const TestFullUserResSchema = resSchema(
  TestFieldsOutSchema.extend({ testSets: z.array(TestSetWithQuestionsFieldsSchema) })
)

export class TestFullUserResDTO extends createZodDto(TestFullUserResSchema) {}

const PickedQuestionFieldsSchema = z.object({
  id: z.number(),
  question: z.string().nullable(),
  questionType: z.string(),
  audioUrl: z.string().nullable(),
  pronunciation: z.string().nullable(),
  levelN: z.number().nullable()
})

export const RandomQuestionsResSchema = resSchema(
  z.object({
    levelN: z.number(),
    count: z.number(),
    questions: z.array(
      PickedQuestionFieldsSchema.extend({
        answers: z.array(AnswerLabelOutSchema.extend({ isCorrect: z.boolean() }))
      })
    )
  })
)

export class RandomQuestionsResDTO extends createZodDto(RandomQuestionsResSchema) {}

export const PlacementQuestionsResSchema = resSchema(
  z.object({
    distribution: z.object({
      level5: z.number(),
      level4: z.number(),
      level3: z.number(),
      total: z.number()
    }),
    questions: z.array(
      PickedQuestionFieldsSchema.extend({ answers: z.array(AnswerLabelOutSchema) })
    ),
    userTestAttemptId: z.number()
  })
)

export class PlacementQuestionsResDTO extends createZodDto(PlacementQuestionsResSchema) {}

export const LessonReviewQuestionsResSchema = resSchema(
  z.object({
    testSets: z.array(
      z.object({
        questions: z.array(
          z.object({
            id: z.number(),
            questionOrder: z.number(),
            questionBank: z.object({
              id: z.number(),
              question: z.string().nullable(),
              answers: z.array(AnswerLabelOutSchema)
            })
          })
        )
      })
    ),
    userTestAttemptId: z.number()
  })
)

export class LessonReviewQuestionsResDTO extends createZodDto(
  LessonReviewQuestionsResSchema
) {}

export const TestBulkDeleteResSchema = resSchema(
  z.object({
    deletedCount: z.number(),
    deletedIds: z.array(z.number()),
    requestedCount: z.number(),
    notFoundCount: z.number()
  })
)

export class TestBulkDeleteResDTO extends createZodDto(TestBulkDeleteResSchema) {}

export const TestSetsAddedResSchema = resSchema(
  z.object({
    testId: z.number(),
    addedTestSetIds: z.array(z.number()),
    count: z.number()
  })
)

export class TestSetsAddedResDTO extends createZodDto(TestSetsAddedResSchema) {}

export const TestSetsRemovedResSchema = resSchema(
  z.object({
    testId: z.number(),
    removedTestSetIds: z.array(z.number()),
    count: z.number()
  })
)

export class TestSetsRemovedResDTO extends createZodDto(TestSetsRemovedResSchema) {}

export const AutoAddFreeTestSetsResSchema = resSchema(
  z.object({ totalTests: z.number(), totalTestSetsAdded: z.number() })
)

export class AutoAddFreeTestSetsResDTO extends createZodDto(
  AutoAddFreeTestSetsResSchema
) {}
