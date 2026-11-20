import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GetRoundQuestionsAnswerLogDetailSchema,
  RoundQuestionsAnswerLogSchema
} from '../entities/round-question-answerlog.entity'

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

export type CreateRoundQuestionsAnswerLogBody = z.infer<
  typeof CreateRoundQuestionsAnswerLogBodySchema
>

export const CreateRoundQuestionsAnswerLogResSchema = resSchema(
  RoundQuestionsAnswerLogSchema
)

// Update Schema

export const UpdateRoundQuestionsAnswerLogBodySchema =
  CreateRoundQuestionsAnswerLogBodySchema.partial().strict()

export type UpdateRoundQuestionsAnswerLogBody = z.infer<
  typeof UpdateRoundQuestionsAnswerLogBodySchema
>

export const UpdateRoundQuestionsAnswerLogResSchema =
  CreateRoundQuestionsAnswerLogResSchema

// Query Schema

export const GetRoundQuestionsAnswerLogParamsSchema = z.object({
  roundQuestionsAnswerLogId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetRoundQuestionsAnswerLogDetailResSchema = resSchema(
  GetRoundQuestionsAnswerLogDetailSchema
)
