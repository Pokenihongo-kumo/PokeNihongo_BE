import { createZodDto } from 'nestjs-zod'
import {
  CreateKanjiSchema,
  UpdateKanjiSchema,
  GetKanjiByIdParamsSchema,
  GetKanjiListQuerySchema,
  KanjiSchema,
  KanjiListResponseSchema,
  KanjiResSchema,
  KanjiListResSchema,
  KanjiManagementListResSchema
} from '../../entities/kanji.entity'

// Zod DTOs - automatically validated
export class CreateKanjiBodyDTO extends createZodDto(CreateKanjiSchema) {}
export class UpdateKanjiBodyDTO extends createZodDto(UpdateKanjiSchema) {}
export class GetKanjiByIdParamsDTO extends createZodDto(GetKanjiByIdParamsSchema) {}
export class GetKanjiListQueryDTO extends createZodDto(GetKanjiListQuerySchema) {}
export class KanjiResponseDTO extends createZodDto(KanjiSchema) {}
export class KanjiListResponseDTO extends createZodDto(KanjiListResponseSchema) {}
export class KanjiResDTO extends createZodDto(KanjiResSchema) {}
export class KanjiListResDTO extends createZodDto(KanjiListResSchema) {}
export class KanjiManagementListResDTO extends createZodDto(
  KanjiManagementListResSchema
) {}
