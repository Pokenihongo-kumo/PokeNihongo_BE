import { createZodDto } from 'nestjs-zod'
import {
  CreateTranslationSchema,
  CreateTranslationsSchema,
  DeleteTranslationsByKeyParamsSchema,
  GetTranslationByIdParamsSchema,
  GetTranslationListQuerySchema,
  GetTranslationsByKeyQuerySchema,
  GetTranslationsByLanguageQuerySchema,
  UpdateTranslationSchema
} from '../entities/translation.entity'

// No response serializers: rows carry the other modules' *Key columns and a
// serializer schema would strip them from the answer
export class CreateTranslationBodyDTO extends createZodDto(CreateTranslationSchema) {}
export class CreateTranslationsBodyDTO extends createZodDto(CreateTranslationsSchema) {}
export class UpdateTranslationBodyDTO extends createZodDto(UpdateTranslationSchema) {}
export class GetTranslationByIdParamsDTO extends createZodDto(
  GetTranslationByIdParamsSchema
) {}
export class DeleteTranslationsByKeyParamsDTO extends createZodDto(
  DeleteTranslationsByKeyParamsSchema
) {}
export class GetTranslationListQueryDTO extends createZodDto(
  GetTranslationListQuerySchema
) {}
export class GetTranslationsByKeyQueryDTO extends createZodDto(
  GetTranslationsByKeyQuerySchema
) {}
export class GetTranslationsByLanguageQueryDTO extends createZodDto(
  GetTranslationsByLanguageQuerySchema
) {}
