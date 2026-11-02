import { createZodDto } from 'nestjs-zod'
import {
  CreateLanguagesSchema,
  UpdateLanguagesSchema,
  GetLanguagesByIdParamsSchema,
  GetLanguagesListQuerySchema,
  GetLanguagesByCodeParamsSchema,
  LanguagesSchema,
  LanguagesListResponseSchema,
  LanguagesResSchema,
  LanguagesListResSchema
} from '../../entities/languages.entities'

// Zod DTOs
export class CreateLanguagesBodyDTO extends createZodDto(CreateLanguagesSchema) {}
export class UpdateLanguagesBodyDTO extends createZodDto(UpdateLanguagesSchema) {}
export class GetLanguagesByIdParamsDTO extends createZodDto(
  GetLanguagesByIdParamsSchema
) {}
export class GetLanguagesListQueryDTO extends createZodDto(GetLanguagesListQuerySchema) {}
export class GetLanguagesByCodeParamsDTO extends createZodDto(
  GetLanguagesByCodeParamsSchema
) {}
export class LanguagesResponseDTO extends createZodDto(LanguagesSchema) {}
export class LanguagesListResponseDTO extends createZodDto(LanguagesListResponseSchema) {}
export class LanguagesResDTO extends createZodDto(LanguagesResSchema) {}
export class LanguagesListResDTO extends createZodDto(LanguagesListResSchema) {}
