import { createZodDto } from 'nestjs-zod'
import {
  CreateTestSetQuestionBankBodySchema,
  UpdateTestSetQuestionBankBodySchema,
  CreateMultipleTestSetQuestionBankBodySchema,
  GetTestSetQuestionBankByTestSetIdParamsSchema,
  GetTestSetQuestionBankByIdParamsSchema,
  UpdateQuestionOrderSchema,
  DeleteManyTestSetQuestionBankBodySchema
} from '../entities/testset-questionbank.entity'

// Request DTOs (validated by the global ZodValidationPipe)
export class CreateTestSetQuestionBankBodyDTO extends createZodDto(
  CreateTestSetQuestionBankBodySchema
) {}
export class UpdateTestSetQuestionBankBodyDTO extends createZodDto(
  UpdateTestSetQuestionBankBodySchema
) {}
export class CreateMultipleTestSetQuestionBankBodyDTO extends createZodDto(
  CreateMultipleTestSetQuestionBankBodySchema
) {}
export class GetTestSetQuestionBankByTestSetIdParamsDTO extends createZodDto(
  GetTestSetQuestionBankByTestSetIdParamsSchema
) {}
export class GetTestSetQuestionBankByIdParamsDTO extends createZodDto(
  GetTestSetQuestionBankByIdParamsSchema
) {}
export class UpdateQuestionOrderDTO extends createZodDto(UpdateQuestionOrderSchema) {}
export class DeleteManyTestSetQuestionBankBodyDTO extends createZodDto(
  DeleteManyTestSetQuestionBankBodySchema
) {}
