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

export class GetTestSetQuestionBankByTestSetIdParamsDTO extends createZodDto(
  GetTestSetQuestionBankByTestSetIdParamsSchema
) {}

// Get TestSetQuestionBank by ID Params Schema

export const GetTestSetQuestionBankByIdParamsSchema = z
  .object({
    id: checkIdSchema(TestSetQuestionBankMessage.INVALID_ID)
  })
  .strict()

export class GetTestSetQuestionBankByIdParamsDTO extends createZodDto(
  GetTestSetQuestionBankByIdParamsSchema
) {}

// Update Question Order Schema

export const UpdateQuestionOrderSchema = z
  .object({
    questionOrder: QuestionOrderSchema
  })
  .strict()

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
