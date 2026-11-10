import { createZodDto } from 'nestjs-zod'
import {
  CreateKanjiReadingSchema,
  UpdateKanjiReadingSchema,
  GetKanjiReadingByIdParamsSchema,
  GetKanjiReadingListQuerySchema,
  GetKanjiReadingsByKanjiIdParamsSchema,
  GetKanjiReadingsByTypeParamsSchema,
  KanjiReadingSchema,
  KanjiReadingListResponseSchema,
  KanjiReadingResSchema,
  KanjiReadingListResSchema
} from '../entities/kanji-reading.entity'

// Zod DTOs
export class CreateKanjiReadingBodyDTO extends createZodDto(CreateKanjiReadingSchema) {}
export class UpdateKanjiReadingBodyDTO extends createZodDto(UpdateKanjiReadingSchema) {}
export class GetKanjiReadingByIdParamsDTO extends createZodDto(
  GetKanjiReadingByIdParamsSchema
) {}
export class GetKanjiReadingListQueryDTO extends createZodDto(
  GetKanjiReadingListQuerySchema
) {}
export class GetKanjiReadingsByKanjiIdParamsDTO extends createZodDto(
  GetKanjiReadingsByKanjiIdParamsSchema
) {}
export class GetKanjiReadingsByTypeParamsDTO extends createZodDto(
  GetKanjiReadingsByTypeParamsSchema
) {}
export class KanjiReadingResponseDTO extends createZodDto(KanjiReadingSchema) {}
export class KanjiReadingListResponseDTO extends createZodDto(
  KanjiReadingListResponseSchema
) {}
export class KanjiReadingResDTO extends createZodDto(KanjiReadingResSchema) {}
export class KanjiReadingListResDTO extends createZodDto(KanjiReadingListResSchema) {}
