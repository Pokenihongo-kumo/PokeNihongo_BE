import { createZodDto } from 'nestjs-zod'
import {
  CreateGrammarUsageBodySchema,
  GetGrammarUsageByIdParamsSchema,
  GetGrammarUsageListQuerySchema,
  UpdateGrammarUsageBodySchema
} from '../entities/grammar-usage.entity'

export class CreateGrammarUsageBodyDTO extends createZodDto(
  CreateGrammarUsageBodySchema
) {}
export class UpdateGrammarUsageBodyDTO extends createZodDto(
  UpdateGrammarUsageBodySchema
) {}
export class GetGrammarUsageByIdParamsDTO extends createZodDto(
  GetGrammarUsageByIdParamsSchema
) {}
export class GetGrammarUsageListQueryDTO extends createZodDto(
  GetGrammarUsageListQuerySchema
) {}
