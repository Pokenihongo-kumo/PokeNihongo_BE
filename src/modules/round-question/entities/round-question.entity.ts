import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
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

// Create Schema
export const CreateRoundQuestionBodySchema = RoundQuestionSchema.pick({
  matchRoundParticipantId: true,
  questionBankId: true,
  orderNumber: true
})

  .strict()

export const CreateRoundQuestionResSchema = resSchema(RoundQuestionSchema)

// Update Schema
export const UpdateRoundQuestionBodySchema =
  CreateRoundQuestionBodySchema.partial().strict()

export const UpdateRoundQuestionResSchema = CreateRoundQuestionResSchema

export const AnswerQuestionBodySchema = z
  .object({
    answerId: z.number(),
    timeAnswerMs: z.number()
  })
  .strict()

export const AnswerQuestionResSchema = resSchema(RoundQuestionSchema)

export const UpdateWithListItemResSchema = resSchema(z.array(RoundQuestionSchema))

// Query Schema
export const GetRoundQuestionParamsSchema = z.object({
  roundQuestionId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetRoundQuestionDetailSchema = RoundQuestionSchema

export const GetRoundQuestionDetailResSchema = resSchema(GetRoundQuestionDetailSchema)

// Type exports
export type RoundQuestionType = z.infer<typeof RoundQuestionSchema>
export type CreateRoundQuestionBodyType = z.infer<typeof CreateRoundQuestionBodySchema>
export type UpdateRoundQuestionBodyType = z.infer<typeof UpdateRoundQuestionBodySchema>
export type GetRoundQuestionParamsType = z.infer<typeof GetRoundQuestionParamsSchema>

// Field for query
export type RoundQuestionFieldType = keyof z.infer<typeof RoundQuestionSchema>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  RoundQuestionSchema.shape
) as RoundQuestionFieldType[]

export type AnswerQuestionBodyType = z.infer<typeof AnswerQuestionBodySchema>
