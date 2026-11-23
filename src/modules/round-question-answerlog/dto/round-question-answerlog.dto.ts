import { z } from 'zod'
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
export type CreateRoundQuestionsAnswerLogBody = z.infer<
  typeof CreateRoundQuestionsAnswerLogBodySchema
>

export class CreateRoundQuestionsAnswerLogBodyDTO extends createZodDto(
  CreateRoundQuestionsAnswerLogBodySchema
) {}

export type UpdateRoundQuestionsAnswerLogBody = z.infer<
  typeof UpdateRoundQuestionsAnswerLogBodySchema
>

export class UpdateRoundQuestionsAnswerLogBodyDTO extends createZodDto(
  UpdateRoundQuestionsAnswerLogBodySchema
) {}

export type GetRoundQuestionsAnswerLogParams = z.infer<
  typeof GetRoundQuestionsAnswerLogParamsSchema
>

export class GetRoundQuestionsAnswerLogParamsDTO extends createZodDto(
  GetRoundQuestionsAnswerLogParamsSchema
) {}

// Response DTOs
export type CreateRoundQuestionsAnswerLogRes = z.infer<
  typeof CreateRoundQuestionsAnswerLogResSchema
>

export class CreateRoundQuestionsAnswerLogResDTO extends createZodDto(
  CreateRoundQuestionsAnswerLogResSchema
) {}
export type UpdateRoundQuestionsAnswerLogRes = z.infer<
  typeof UpdateRoundQuestionsAnswerLogResSchema
>

export class UpdateRoundQuestionsAnswerLogResDTO extends createZodDto(
  UpdateRoundQuestionsAnswerLogResSchema
) {}
export type GetRoundQuestionsAnswerLogDetailRes = z.infer<
  typeof GetRoundQuestionsAnswerLogDetailResSchema
>

export class GetRoundQuestionsAnswerLogDetailResDTO extends createZodDto(
  GetRoundQuestionsAnswerLogDetailResSchema
) {}
