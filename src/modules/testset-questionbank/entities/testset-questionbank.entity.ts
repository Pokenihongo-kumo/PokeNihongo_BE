import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

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

// Types
export type TestSetQuestionBank = z.infer<typeof TestSetQuestionBankSchema>
