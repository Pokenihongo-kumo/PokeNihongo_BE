import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base RoundQuestionsAnswerLog Schema
export const RoundQuestionsAnswerLogSchema = z.object({
  id: z.number(),
  roundQuestionId: z.number(),
  answerId: z.number().nullable(),
  isCorrect: z.boolean(),
  timeAnswerMs: z.number().default(60000),
  pointsEarned: z.number().default(100),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const GetRoundQuestionsAnswerLogDetailSchema = RoundQuestionsAnswerLogSchema

// Type exports
export type RoundQuestionsAnswerLog = z.infer<typeof RoundQuestionsAnswerLogSchema>
// Field for query
export type RoundQuestionsAnswerLogFieldType = keyof z.infer<
  typeof RoundQuestionsAnswerLogSchema
>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  RoundQuestionsAnswerLogSchema.shape
) as RoundQuestionsAnswerLogFieldType[]
