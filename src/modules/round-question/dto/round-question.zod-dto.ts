import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GetRoundQuestionDetailSchema,
  RoundQuestionSchema
} from '../entities/round-question.entity'

// Create Schema

export const CreateRoundQuestionBodySchema = RoundQuestionSchema.pick({
  matchRoundParticipantId: true,
  questionBankId: true,
  orderNumber: true
})

  .strict()

export type CreateRoundQuestionBody = z.infer<typeof CreateRoundQuestionBodySchema>

export const CreateRoundQuestionResSchema = resSchema(RoundQuestionSchema)

// Update Schema

export const UpdateRoundQuestionBodySchema =
  CreateRoundQuestionBodySchema.partial().strict()

export type UpdateRoundQuestionBody = z.infer<typeof UpdateRoundQuestionBodySchema>

export const UpdateRoundQuestionResSchema = CreateRoundQuestionResSchema

export const AnswerQuestionBodySchema = z
  .object({
    answerId: z.number(),
    timeAnswerMs: z.number()
  })
  .strict()

export type AnswerQuestionBody = z.infer<typeof AnswerQuestionBodySchema>

// Query Schema

export const GetRoundQuestionParamsSchema = z.object({
  roundQuestionId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetRoundQuestionDetailResSchema = resSchema(GetRoundQuestionDetailSchema)
