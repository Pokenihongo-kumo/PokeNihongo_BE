import { createZodDto } from 'nestjs-zod'
import {
  AnswerListResSchema,
  AnswerResponseSchema,
  CreateAnswerBodySchema,
  CreateMultipleAnswersBodySchema,
  CreateMultipleAnswersResponseSchema,
  GetAnswerByIdParamsSchema,
  GetAnswerListQuerySchema,
  UpdateAnswerBodySchema
} from '../entities/answer.entity'

export class CreateAnswerBodyDTO extends createZodDto(CreateAnswerBodySchema) {}
export class CreateMultipleAnswersBodyDTO extends createZodDto(
  CreateMultipleAnswersBodySchema
) {}
export class UpdateAnswerBodyDTO extends createZodDto(UpdateAnswerBodySchema) {}
export class GetAnswerByIdParamsDTO extends createZodDto(GetAnswerByIdParamsSchema) {}
export class GetAnswerListQueryDTO extends createZodDto(GetAnswerListQuerySchema) {}
export class AnswerResponseDTO extends createZodDto(AnswerResponseSchema) {}
export class AnswerListResDTO extends createZodDto(AnswerListResSchema) {}
export class CreateMultipleAnswersResponseDTO extends createZodDto(
  CreateMultipleAnswersResponseSchema
) {}
