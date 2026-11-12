import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { TestSetQuestionBankMessage } from '@/i18n/message-keys'
import { checkIdSchema } from '@/common/utils/id.validation'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Body ids are JSON numbers (no coercion); params use checkIdSchema
const idOf = (key: string) =>
  z.number({ invalid_type_error: key, required_error: key }).int(key).positive(key)

const QuestionOrderSchema = idOf(TestSetQuestionBankMessage.INVALID_QUESTION_ORDER)

// TestSetQuestionBank Schema
export const TestSetQuestionBankSchema = z.object({
  id: z.number(),
  testSetId: z.number(),
  questionBankId: z.number(),
  questionOrder: z.number(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create TestSetQuestionBank Schema
export const CreateTestSetQuestionBankBodySchema = z
  .object({
    testSetId: idOf(TestSetQuestionBankMessage.INVALID_TEST_SET_ID),
    questionBankId: idOf(TestSetQuestionBankMessage.INVALID_QUESTION_BANK_ID),
    questionOrder: QuestionOrderSchema.optional() // Ignored: appended after the last question
  })
  .strict()

// Update TestSetQuestionBank Schema
export const UpdateTestSetQuestionBankBodySchema =
  CreateTestSetQuestionBankBodySchema.partial().strict()

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

// Get TestSetQuestionBank by TestSet ID Params Schema
export const GetTestSetQuestionBankByTestSetIdParamsSchema = z
  .object({
    testSetId: checkIdSchema(TestSetQuestionBankMessage.INVALID_TEST_SET_ID)
  })
  .strict()

// Get TestSetQuestionBank by ID Params Schema
export const GetTestSetQuestionBankByIdParamsSchema = z
  .object({
    id: checkIdSchema(TestSetQuestionBankMessage.INVALID_ID)
  })
  .strict()

// Update Question Order Schema
export const UpdateQuestionOrderSchema = z
  .object({
    questionOrder: QuestionOrderSchema
  })
  .strict()

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

// Types
export type TestSetQuestionBankType = z.infer<typeof TestSetQuestionBankSchema>
export type CreateTestSetQuestionBankBodyType = z.infer<
  typeof CreateTestSetQuestionBankBodySchema
>
export type UpdateTestSetQuestionBankBodyType = z.infer<
  typeof UpdateTestSetQuestionBankBodySchema
>
export type CreateMultipleTestSetQuestionBankBodyType = z.infer<
  typeof CreateMultipleTestSetQuestionBankBodySchema
>
export type GetTestSetQuestionBankByTestSetIdParamsType = z.infer<
  typeof GetTestSetQuestionBankByTestSetIdParamsSchema
>
export type GetTestSetQuestionBankByIdParamsType = z.infer<
  typeof GetTestSetQuestionBankByIdParamsSchema
>
export type UpdateQuestionOrderType = z.infer<typeof UpdateQuestionOrderSchema>
export type DeleteManyTestSetQuestionBankBodyType = z.infer<
  typeof DeleteManyTestSetQuestionBankBodySchema
>
