import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base RoundQuestion Schema
export const RoundQuestionSchema = z.object({
  id: z.number(),
  matchRoundParticipantId: z.number(),
  questionBankId: z.number(),
  timeLimitMs: z.number().default(60000),
  endTimeQuestion: z.date().nullable(),
  basePoints: z.number().default(100),
  orderNumber: z.number(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const GetRoundQuestionDetailSchema = RoundQuestionSchema

// Type exports
export type RoundQuestion = z.infer<typeof RoundQuestionSchema>
// Field for query
export type RoundQuestionFieldType = keyof z.infer<typeof RoundQuestionSchema>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  RoundQuestionSchema.shape
) as RoundQuestionFieldType[]
