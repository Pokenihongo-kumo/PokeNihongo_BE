import { createZodDto } from 'nestjs-zod'
import {
  CreateWordTypeSchema,
  UpdateWordTypeSchema,
  GetWordTypeByIdParamsSchema,
  GetWordTypeListQuerySchema,
  GetWordTypeByNameKeyParamsSchema,
  WordTypeSchema,
  WordTypeListResSchema
} from '../entities/wordtype.entity'

// Zod DTOs
export class CreateWordTypeBodyDTO extends createZodDto(CreateWordTypeSchema) {}
export class UpdateWordTypeBodyDTO extends createZodDto(UpdateWordTypeSchema) {}
export class GetWordTypeByIdParamsDTO extends createZodDto(GetWordTypeByIdParamsSchema) {}
export class GetWordTypeListQueryDTO extends createZodDto(GetWordTypeListQuerySchema) {}
export class GetWordTypeByNameKeyParamsDTO extends createZodDto(
  GetWordTypeByNameKeyParamsSchema
) {}
export class WordTypeResponseDTO extends createZodDto(WordTypeSchema) {}
export class WordTypeListResDTO extends createZodDto(WordTypeListResSchema) {}
