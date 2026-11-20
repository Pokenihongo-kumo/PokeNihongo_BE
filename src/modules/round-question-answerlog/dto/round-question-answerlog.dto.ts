import { createZodDto } from 'nestjs-zod'
import {
  CreateRoundQuestionsAnswerLogBodySchema,
  CreateRoundQuestionsAnswerLogResSchema,
  GetRoundQuestionsAnswerLogDetailResSchema,
  GetRoundQuestionsAnswerLogParamsSchema,
  UpdateRoundQuestionsAnswerLogBodySchema,
  UpdateRoundQuestionsAnswerLogResSchema
} from './round-question-answerlog.zod-dto'

// Request DTOs
export class CreateRoundQuestionsAnswerLogBodyDTO extends createZodDto(
  CreateRoundQuestionsAnswerLogBodySchema
) {}

export class UpdateRoundQuestionsAnswerLogBodyDTO extends createZodDto(
  UpdateRoundQuestionsAnswerLogBodySchema
) {}

export class GetRoundQuestionsAnswerLogParamsDTO extends createZodDto(
  GetRoundQuestionsAnswerLogParamsSchema
) {}

// Response DTOs
export class CreateRoundQuestionsAnswerLogResDTO extends createZodDto(
  CreateRoundQuestionsAnswerLogResSchema
) {}
export class UpdateRoundQuestionsAnswerLogResDTO extends createZodDto(
  UpdateRoundQuestionsAnswerLogResSchema
) {}
export class GetRoundQuestionsAnswerLogDetailResDTO extends createZodDto(
  GetRoundQuestionsAnswerLogDetailResSchema
) {}
