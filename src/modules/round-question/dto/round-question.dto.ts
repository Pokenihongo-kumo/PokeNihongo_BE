import { createZodDto } from 'nestjs-zod'
import {
  AnswerQuestionBodySchema,
  CreateRoundQuestionBodySchema,
  CreateRoundQuestionResSchema,
  GetRoundQuestionDetailResSchema,
  GetRoundQuestionParamsSchema,
  UpdateRoundQuestionBodySchema,
  UpdateRoundQuestionResSchema,
  UpdateWithListItemResSchema
} from './round-question.zod-dto'

// Request DTOs
export class CreateRoundQuestionBodyDTO extends createZodDto(
  CreateRoundQuestionBodySchema
) {}

export class UpdateRoundQuestionBodyDTO extends createZodDto(
  UpdateRoundQuestionBodySchema
) {}

export class GetRoundQuestionParamsDTO extends createZodDto(
  GetRoundQuestionParamsSchema
) {}

// Response DTOs
export class CreateRoundQuestionResDTO extends createZodDto(
  CreateRoundQuestionResSchema
) {}
export class UpdateRoundQuestionResDTO extends createZodDto(
  UpdateRoundQuestionResSchema
) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetRoundQuestionDetailResDTO extends createZodDto(
  GetRoundQuestionDetailResSchema
) {}

export class AnswerQuestionBodyDTO extends createZodDto(AnswerQuestionBodySchema) {}
