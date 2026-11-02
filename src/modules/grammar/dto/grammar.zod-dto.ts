import { createZodDto } from 'nestjs-zod'
import {
  CreateGrammarBodyType,
  UpdateGrammarBodyType,
  CreateGrammarBasicBodyType,
  GetGrammarByIdParamsType,
  GetGrammarListQueryType,
  GrammarListResSchema
} from '../entities/grammar.entities'

export class CreateGrammarBodyDTO extends createZodDto(CreateGrammarBodyType) {}
export class UpdateGrammarBodyDTO extends createZodDto(UpdateGrammarBodyType) {}
export class CreateGrammarBasicBodyDTO extends createZodDto(CreateGrammarBasicBodyType) {}
export class GetGrammarByIdParamsDTO extends createZodDto(GetGrammarByIdParamsType) {}
export class GetGrammarListQueryDTO extends createZodDto(GetGrammarListQueryType) {}
export class GrammarListResDTO extends createZodDto(GrammarListResSchema) {}
