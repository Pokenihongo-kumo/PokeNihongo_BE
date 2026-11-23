import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  AnswerQuestionBodySchema,
  CreateRoundQuestionBodySchema,
  CreateRoundQuestionResSchema,
  GetRoundQuestionDetailResSchema,
  GetRoundQuestionParamsSchema,
  UpdateRoundQuestionBodySchema,
  UpdateRoundQuestionResSchema
} from './round-question.zod-dto'

// Request DTOs

export type CreateRoundQuestionBody = z.infer<typeof CreateRoundQuestionBodySchema>

export class CreateRoundQuestionBodyDTO extends createZodDto(
  CreateRoundQuestionBodySchema
) {}

export type UpdateRoundQuestionBody = z.infer<typeof UpdateRoundQuestionBodySchema>

export class UpdateRoundQuestionBodyDTO extends createZodDto(
  UpdateRoundQuestionBodySchema
) {}

export type GetRoundQuestionParams = z.infer<typeof GetRoundQuestionParamsSchema>

export class GetRoundQuestionParamsDTO extends createZodDto(
  GetRoundQuestionParamsSchema
) {}

// Response DTOs

export type CreateRoundQuestionRes = z.infer<typeof CreateRoundQuestionResSchema>

export class CreateRoundQuestionResDTO extends createZodDto(
  CreateRoundQuestionResSchema
) {}

export type UpdateRoundQuestionRes = z.infer<typeof UpdateRoundQuestionResSchema>

export class UpdateRoundQuestionResDTO extends createZodDto(
  UpdateRoundQuestionResSchema
) {}

export type GetRoundQuestionDetailRes = z.infer<typeof GetRoundQuestionDetailResSchema>

export class GetRoundQuestionDetailResDTO extends createZodDto(
  GetRoundQuestionDetailResSchema
) {}

export type AnswerQuestionBody = z.infer<typeof AnswerQuestionBodySchema>

export class AnswerQuestionBodyDTO extends createZodDto(AnswerQuestionBodySchema) {}
