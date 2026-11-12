import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { QuestionType } from '@prisma/client'

extendZodWithOpenApi(z)
patchNestJsSwagger()

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
    testSetId: z.number(),
    questionBankId: z.number(),
    questionOrder: z.number().optional() // Optional - will be auto-calculated
  })
  .strict()

// Update TestSetQuestionBank Schema
export const UpdateTestSetQuestionBankBodySchema =
  CreateTestSetQuestionBankBodySchema.partial().strict()

// Create Multiple TestSetQuestionBank Schema
export const CreateMultipleTestSetQuestionBankBodySchema = z
  .object({
    testSetId: z.number(),
    questionBankIds: z.array(z.number()).min(1, 'Phải có ít nhất 1 QuestionBank')
  })
  .strict()

// Get TestSetQuestionBank by TestSet ID Params Schema
export const GetTestSetQuestionBankByTestSetIdParamsSchema = z
  .object({
    testSetId: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

// Get TestSetQuestionBank by ID Params Schema
export const GetTestSetQuestionBankByIdParamsSchema = z
  .object({
    id: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

// Update Question Order Schema
export const UpdateQuestionOrderSchema = z
  .object({
    questionOrder: z.number()
  })
  .strict()

// Batch Update Question Order Schema (for drag & drop)
export const BatchUpdateQuestionOrderSchema = z
  .object({
    orders: z
      .array(
        z.object({
          id: z.number().int().positive(), // ID của TestSetQuestionBank
          questionOrder: z.number().int().positive()
        })
      )
      .min(1, 'Phải có ít nhất 1 order')
  })
  .strict()

// Delete Many Schema
export const DeleteManyTestSetQuestionBankBodySchema = z
  .object({
    ids: z.array(z.number()).min(1, 'Phải có ít nhất 1 id')
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

// Response schema for multiple creation
export const CreateMultipleTestSetQuestionBankResponseSchema = z.object({
  created: z.array(TestSetQuestionBankSchema),
  failed: z.array(
    z.object({
      questionBankId: z.number(),
      reason: z.string()
    })
  ),
  summary: z.object({
    total: z.number(),
    success: z.number(),
    failed: z.number()
  })
})

export type CreateMultipleTestSetQuestionBankResponseType = z.infer<
  typeof CreateMultipleTestSetQuestionBankResponseSchema
>
export type GetTestSetQuestionBankByTestSetIdParamsType = z.infer<
  typeof GetTestSetQuestionBankByTestSetIdParamsSchema
>
export type GetTestSetQuestionBankByIdParamsType = z.infer<
  typeof GetTestSetQuestionBankByIdParamsSchema
>
export type UpdateQuestionOrderType = z.infer<typeof UpdateQuestionOrderSchema>
export type BatchUpdateQuestionOrderType = z.infer<typeof BatchUpdateQuestionOrderSchema>
export type DeleteManyTestSetQuestionBankBodyType = z.infer<
  typeof DeleteManyTestSetQuestionBankBodySchema
>
