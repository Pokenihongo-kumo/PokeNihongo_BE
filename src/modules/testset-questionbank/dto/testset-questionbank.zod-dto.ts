import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import {
  TestSetQuestionBankSchema,
  CreateTestSetQuestionBankBodySchema,
  UpdateTestSetQuestionBankBodySchema,
  GetTestSetQuestionBankByTestSetIdParamsSchema,
  GetTestSetQuestionBankByIdParamsSchema,
  UpdateQuestionOrderSchema,
  BatchUpdateQuestionOrderSchema,
  DeleteManyTestSetQuestionBankBodySchema
} from '../entities/testset-questionbank.entities'

// Zod DTOs for request/response validation
export const CreateTestSetQuestionBankBodyDTO = createZodDto(
  CreateTestSetQuestionBankBodySchema
)
export const UpdateTestSetQuestionBankBodyDTO = createZodDto(
  UpdateTestSetQuestionBankBodySchema
)
export const GetTestSetQuestionBankByTestSetIdParamsDTO = createZodDto(
  GetTestSetQuestionBankByTestSetIdParamsSchema
)
export const GetTestSetQuestionBankByIdParamsDTO = createZodDto(
  GetTestSetQuestionBankByIdParamsSchema
)
export const UpdateQuestionOrderDTO = createZodDto(UpdateQuestionOrderSchema)
export const BatchUpdateQuestionOrderDTO = createZodDto(BatchUpdateQuestionOrderSchema)
export const DeleteManyTestSetQuestionBankBodyDTO = createZodDto(
  DeleteManyTestSetQuestionBankBodySchema
)

// Response DTOs
export const TestSetQuestionBankResDTO = createZodDto(
  z.object({
    statusCode: z.number(),
    data: TestSetQuestionBankSchema,
    message: z.string()
  })
)

export const TestSetQuestionBankListResDTO = createZodDto(
  z.object({
    statusCode: z.number(),
    data: z.array(TestSetQuestionBankSchema),
    message: z.string()
  })
)
