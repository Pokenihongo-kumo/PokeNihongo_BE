import { createZodDto } from 'nestjs-zod'
import {
  CreateQuestionBankWithMeaningsBodySchema,
  UpdateQuestionBankWithMeaningsBodySchema,
  CreateQuestionBankWithAnswersBodySchema,
  GetQuestionBankByIdParamsSchema,
  GetQuestionBankListQuerySchema,
  GetQuestionBanksByIdsQuerySchema,
  QuestionBankResSchema,
  BulkDeleteQuestionBankBodySchema
} from '../entities/question-bank.entity'

export class CreateQuestionBankWithMeaningsBodyDTO extends createZodDto(
  CreateQuestionBankWithMeaningsBodySchema
) {}
export class UpdateQuestionBankWithMeaningsBodyDTO extends createZodDto(
  UpdateQuestionBankWithMeaningsBodySchema
) {}
export class CreateQuestionBankWithAnswersBodyDTO extends createZodDto(
  CreateQuestionBankWithAnswersBodySchema
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
export class BulkDeleteQuestionBankBodyDTO extends createZodDto(
  BulkDeleteQuestionBankBodySchema
) {}
