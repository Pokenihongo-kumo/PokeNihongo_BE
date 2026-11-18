import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
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

// Create Schema
export const CreateRoundQuestionsAnswerLogBodySchema = RoundQuestionsAnswerLogSchema.pick(
  {
    roundQuestionId: true,
    answerId: true,
    isCorrect: true,
    timeAnswerMs: true,
    pointsEarned: true
  }
)

  .strict()

export const CreateRoundQuestionsAnswerLogResSchema = resSchema(
  RoundQuestionsAnswerLogSchema
)

// Update Schema
export const UpdateRoundQuestionsAnswerLogBodySchema =
  CreateRoundQuestionsAnswerLogBodySchema.partial().strict()

export const UpdateRoundQuestionsAnswerLogResSchema =
  CreateRoundQuestionsAnswerLogResSchema

export const UpdateWithListItemResSchema = resSchema(
  z.array(RoundQuestionsAnswerLogSchema)
)

// Query Schema
export const GetRoundQuestionsAnswerLogParamsSchema = z.object({
  roundQuestionsAnswerLogId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetRoundQuestionsAnswerLogDetailSchema = RoundQuestionsAnswerLogSchema

export const GetRoundQuestionsAnswerLogDetailResSchema = resSchema(
  GetRoundQuestionsAnswerLogDetailSchema
)

// Type exports
export type RoundQuestionsAnswerLog = z.infer<typeof RoundQuestionsAnswerLogSchema>
export type CreateRoundQuestionsAnswerLogBody = z.infer<
  typeof CreateRoundQuestionsAnswerLogBodySchema
>
export type UpdateRoundQuestionsAnswerLogBody = z.infer<
  typeof UpdateRoundQuestionsAnswerLogBodySchema
>
export type GetRoundQuestionsAnswerLogParams = z.infer<
  typeof GetRoundQuestionsAnswerLogParamsSchema
>

// Field for query
export type RoundQuestionsAnswerLogFieldType = keyof z.infer<
  typeof RoundQuestionsAnswerLogSchema
>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  RoundQuestionsAnswerLogSchema.shape
) as RoundQuestionsAnswerLogFieldType[]
