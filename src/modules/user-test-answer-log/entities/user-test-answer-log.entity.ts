import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// UserTestAnswerLog schema
export const UserTestAnswerLogSchema = z.object({
  id: z.number(),
  isCorrect: z.boolean(),
  userTestAttemptId: z.number(),
  questionBankId: z.number(),
  answerId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Types
export type UserTestAnswerLog = z.infer<typeof UserTestAnswerLogSchema>
