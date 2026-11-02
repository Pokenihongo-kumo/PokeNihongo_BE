import { createZodDto } from 'nestjs-zod'
import {
  CreateGrammarUsageBodyType,
  UpdateGrammarUsageBodyType,
  GetGrammarUsageByIdParamsType,
  GetGrammarUsageListQueryType
} from '../entities/grammar-usage.entities'

export class CreateGrammarUsageBodyDTO extends createZodDto(CreateGrammarUsageBodyType) {}
export class UpdateGrammarUsageBodyDTO extends createZodDto(UpdateGrammarUsageBodyType) {}
export class GetGrammarUsageByIdParamsDTO extends createZodDto(
  GetGrammarUsageByIdParamsType
) {}
export class GetGrammarUsageListQueryDTO extends createZodDto(
  GetGrammarUsageListQueryType
) {}
