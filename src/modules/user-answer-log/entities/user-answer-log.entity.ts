import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// UserAnswerLog schema
export const UserAnswerLogSchema = z.object({
  id: z.number(),
  isCorrect: z.boolean(),
  userExerciseAttemptId: z.number(),
  questionBankId: z.number(),
  answerId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Types
export type UserAnswerLog = z.infer<typeof UserAnswerLogSchema>
