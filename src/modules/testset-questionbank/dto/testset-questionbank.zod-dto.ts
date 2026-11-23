import { TestSetQuestionBankSchema } from '../entities/testset-questionbank.entity'
import { resSchema } from '@/shared/utils/res-schema'
import { checkIdSchema } from '@/common/utils/id.validation'
import { TestSetQuestionBankMessage } from '@/i18n/message-keys'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Body ids are JSON numbers (no coercion); params use checkIdSchema
export const idOf = (key: string) =>
  z.number({ invalid_type_error: key, required_error: key }).int(key).positive(key)

export const QuestionOrderSchema = idOf(TestSetQuestionBankMessage.INVALID_QUESTION_ORDER)

// Create TestSetQuestionBank Schema

export const CreateTestSetQuestionBankBodySchema = z
  .object({
    testSetId: idOf(TestSetQuestionBankMessage.INVALID_TEST_SET_ID),
    questionBankId: idOf(TestSetQuestionBankMessage.INVALID_QUESTION_BANK_ID),
    questionOrder: QuestionOrderSchema.optional() // Ignored: appended after the last question
  })
  .strict()

export type CreateTestSetQuestionBankBody = z.infer<
  typeof CreateTestSetQuestionBankBodySchema
>

// Request DTOs (validated by the global ZodValidationPipe)
export class CreateTestSetQuestionBankBodyDTO extends createZodDto(
  CreateTestSetQuestionBankBodySchema
) {}

// Update TestSetQuestionBank Schema

export const UpdateTestSetQuestionBankBodySchema =
  CreateTestSetQuestionBankBodySchema.partial().strict()

export type UpdateTestSetQuestionBankBody = z.infer<
  typeof UpdateTestSetQuestionBankBodySchema
>

export class UpdateTestSetQuestionBankBodyDTO extends createZodDto(
  UpdateTestSetQuestionBankBodySchema
) {}

// Create Multiple TestSetQuestionBank Schema

export const CreateMultipleTestSetQuestionBankBodySchema = z
  .object({
    testSetId: idOf(TestSetQuestionBankMessage.INVALID_TEST_SET_ID),
    questionBankIds: z
      .array(idOf(TestSetQuestionBankMessage.INVALID_QUESTION_BANK_ID), {
        invalid_type_error: TestSetQuestionBankMessage.QUESTION_BANK_IDS_REQUIRED,
        required_error: TestSetQuestionBankMessage.QUESTION_BANK_IDS_REQUIRED
      })
      .min(1, TestSetQuestionBankMessage.QUESTION_BANK_IDS_REQUIRED)
  })
  .strict()

export type CreateMultipleTestSetQuestionBankBody = z.infer<
  typeof CreateMultipleTestSetQuestionBankBodySchema
>

export class CreateMultipleTestSetQuestionBankBodyDTO extends createZodDto(
  CreateMultipleTestSetQuestionBankBodySchema
) {}

// Get TestSetQuestionBank by TestSet ID Params Schema

export const GetTestSetQuestionBankByTestSetIdParamsSchema = z
  .object({
    testSetId: checkIdSchema(TestSetQuestionBankMessage.INVALID_TEST_SET_ID)
  })
  .strict()

export type GetTestSetQuestionBankByTestSetIdParams = z.infer<
  typeof GetTestSetQuestionBankByTestSetIdParamsSchema
>

export class GetTestSetQuestionBankByTestSetIdParamsDTO extends createZodDto(
  GetTestSetQuestionBankByTestSetIdParamsSchema
) {}

// Get TestSetQuestionBank by ID Params Schema

export const GetTestSetQuestionBankByIdParamsSchema = z
  .object({
    id: checkIdSchema(TestSetQuestionBankMessage.INVALID_ID)
  })
  .strict()

export type GetTestSetQuestionBankByIdParams = z.infer<
  typeof GetTestSetQuestionBankByIdParamsSchema
>

export class GetTestSetQuestionBankByIdParamsDTO extends createZodDto(
  GetTestSetQuestionBankByIdParamsSchema
) {}

// Update Question Order Schema

export const UpdateQuestionOrderSchema = z
  .object({
    questionOrder: QuestionOrderSchema
  })
  .strict()

export type UpdateQuestionOrder = z.infer<typeof UpdateQuestionOrderSchema>

export class UpdateQuestionOrderDTO extends createZodDto(UpdateQuestionOrderSchema) {}

// Delete Many Schema

export const DeleteManyTestSetQuestionBankBodySchema = z
  .object({
    ids: z
      .array(idOf(TestSetQuestionBankMessage.INVALID_ID), {
        invalid_type_error: TestSetQuestionBankMessage.IDS_REQUIRED,
        required_error: TestSetQuestionBankMessage.IDS_REQUIRED
      })
      .min(1, TestSetQuestionBankMessage.IDS_REQUIRED)
  })
  .strict()

export type DeleteManyTestSetQuestionBankBody = z.infer<
  typeof DeleteManyTestSetQuestionBankBodySchema
>

export class DeleteManyTestSetQuestionBankBodyDTO extends createZodDto(
  DeleteManyTestSetQuestionBankBodySchema
) {}

// ---- responses (output only)

export const TestSetQuestionBankResSchema = resSchema(TestSetQuestionBankSchema)

export type TestSetQuestionBankRes = z.infer<typeof TestSetQuestionBankResSchema>

export class TestSetQuestionBankResDTO extends createZodDto(
  TestSetQuestionBankResSchema
) {}

export const TestSetQuestionBankArrayResSchema = resSchema(
  z.array(TestSetQuestionBankSchema)
)

export type TestSetQuestionBankArrayRes = z.infer<
  typeof TestSetQuestionBankArrayResSchema
>

export class TestSetQuestionBankArrayResDTO extends createZodDto(
  TestSetQuestionBankArrayResSchema
) {}

// An answer label in the request language
export const AnswerLabelOutSchema = z.object({
  id: z.number(),
  answer: z.string().nullable()
})

// Full: each link flattened with its question bank and answer labels
export const TestSetQuestionBankFullResSchema = resSchema(
  z.array(
    z.object({
      id: z.number(),
      questionOrder: z.number(),
      questionBankId: z.number(),
      questionJp: z.string().nullable(),
      questionType: z.string(),
      audioUrl: z.string().nullable(),
      questionKey: z.string().nullable(),
      pronunciation: z.string().nullable(),
      role: z.string().nullable(),
      levelN: z.number().nullable(),
      createdById: z.number().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
      answers: z.array(AnswerLabelOutSchema)
    })
  )
)

export type TestSetQuestionBankFullRes = z.infer<typeof TestSetQuestionBankFullResSchema>

export class TestSetQuestionBankFullResDTO extends createZodDto(
  TestSetQuestionBankFullResSchema
) {}

// A question as the test reads give it: text in the request language
export const QuestionWithAnswersOutSchema = z.object({
  id: z.number(),
  questionOrder: z.number(),
  questionBank: z.object({
    id: z.number(),
    question: z.string().nullable(),
    questionType: z.string(),
    audioUrl: z.string().nullable(),
    role: z.string().nullable(),
    pronunciation: z.string().nullable(),
    levelN: z.number().nullable(),
    answers: z.array(AnswerLabelOutSchema)
  })
})

export const TestSetQuestionBankFullWithAnswerResSchema = resSchema(
  z.array(QuestionWithAnswersOutSchema)
)

export type TestSetQuestionBankFullWithAnswerRes = z.infer<
  typeof TestSetQuestionBankFullWithAnswerResSchema
>

export class TestSetQuestionBankFullWithAnswerResDTO extends createZodDto(
  TestSetQuestionBankFullWithAnswerResSchema
) {}

export const TestSetQuestionBankDeletedResSchema = resSchema(
  z.object({ deletedCount: z.number() })
)

export type TestSetQuestionBankDeletedRes = z.infer<
  typeof TestSetQuestionBankDeletedResSchema
>

export class TestSetQuestionBankDeletedResDTO extends createZodDto(
  TestSetQuestionBankDeletedResSchema
) {}
