import { createZodDto } from 'nestjs-zod'
import {
  CreateQuestionBankBodySchema,
  CreateQuestionBankWithMeaningsBodySchema,
  UpdateQuestionBankWithMeaningsBodySchema,
  CreateQuestionBankWithAnswersBodySchema,
  UpdateQuestionBankBodySchema,
  GetQuestionBankByIdParamsSchema,
  GetQuestionBankListQuerySchema,
  GetQuestionBanksByIdsQuerySchema,
  QuestionBankResSchema,
  QuestionBankListResSchema,
  BulkDeleteQuestionBankBodySchema
} from '../entities/question-bank.entities'

export class CreateQuestionBankBodyDTO extends createZodDto(
  CreateQuestionBankBodySchema
) {}
export class CreateQuestionBankWithMeaningsBodyDTO extends createZodDto(
  CreateQuestionBankWithMeaningsBodySchema
) {}
export class UpdateQuestionBankWithMeaningsBodyDTO extends createZodDto(
  UpdateQuestionBankWithMeaningsBodySchema
) {}
export class CreateQuestionBankWithAnswersBodyDTO extends createZodDto(
  CreateQuestionBankWithAnswersBodySchema
) {}
export class UpdateQuestionBankBodyDTO extends createZodDto(
  UpdateQuestionBankBodySchema
) {}
export class GetQuestionBankByIdParamsDTO extends createZodDto(
  GetQuestionBankByIdParamsSchema
) {}
export class GetQuestionBankListQueryDTO extends createZodDto(
  GetQuestionBankListQuerySchema
) {}
export class GetQuestionBanksByIdsQueryDTO extends createZodDto(
  GetQuestionBanksByIdsQuerySchema
) {}
export class QuestionBankResDTO extends createZodDto(QuestionBankResSchema) {}
export class QuestionBankListResDTO extends createZodDto(QuestionBankListResSchema) {}
export class BulkDeleteQuestionBankBodyDTO extends createZodDto(
  BulkDeleteQuestionBankBodySchema
) {}
