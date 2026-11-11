import { createZodDto } from 'nestjs-zod'
import {
  CreateAnswerBodyType,
  CreateMultipleAnswersBodyType,
  UpdateAnswerBodyType,
  GetAnswerByIdParamsType,
  GetAnswerListQueryType,
  AnswerResponseSchema,
  AnswerListResSchema,
  CreateMultipleAnswersResponseSchema
} from '../entities/answer.entity'

export class CreateAnswerBodyDTO extends createZodDto(CreateAnswerBodyType) {}
export class CreateMultipleAnswersBodyDTO extends createZodDto(
  CreateMultipleAnswersBodyType
) {}
export class UpdateAnswerBodyDTO extends createZodDto(UpdateAnswerBodyType) {}
export class GetAnswerByIdParamsDTO extends createZodDto(GetAnswerByIdParamsType) {}
export class GetAnswerListQueryDTO extends createZodDto(GetAnswerListQueryType) {}
export class AnswerResponseDTO extends createZodDto(AnswerResponseSchema) {}
export class AnswerListResDTO extends createZodDto(AnswerListResSchema) {}
export class CreateMultipleAnswersResponseDTO extends createZodDto(
  CreateMultipleAnswersResponseSchema
) {}
