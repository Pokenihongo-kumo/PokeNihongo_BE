import { createZodDto } from 'nestjs-zod'
import {
  CreateGrammarBasicBodySchema,
  CreateGrammarBodySchema,
  GetGrammarByIdParamsSchema,
  GetGrammarListQuerySchema,
  GrammarListResSchema,
  UpdateGrammarBodySchema
} from '../entities/grammar.entity'

export class CreateGrammarBodyDTO extends createZodDto(CreateGrammarBodySchema) {}
export class UpdateGrammarBodyDTO extends createZodDto(UpdateGrammarBodySchema) {}
export class CreateGrammarBasicBodyDTO extends createZodDto(
  CreateGrammarBasicBodySchema
) {}
export class GetGrammarByIdParamsDTO extends createZodDto(GetGrammarByIdParamsSchema) {}
export class GetGrammarListQueryDTO extends createZodDto(GetGrammarListQuerySchema) {}
export class GrammarListResDTO extends createZodDto(GrammarListResSchema) {}
