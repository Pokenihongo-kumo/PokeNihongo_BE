import { createZodDto } from 'nestjs-zod'
import {
  CreateKanjiReadingSchema,
  GetKanjiReadingByIdParamsSchema,
  GetKanjiReadingListQuerySchema,
  GetKanjiReadingsByKanjiIdParamsSchema,
  GetKanjiReadingsByTypeParamsSchema,
  KanjiReadingListResSchema,
  KanjiReadingResSchema,
  UpdateKanjiReadingSchema
} from '../entities/kanji-reading.entity'

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
export class KanjiReadingResDTO extends createZodDto(KanjiReadingResSchema) {}
export class KanjiReadingListResDTO extends createZodDto(KanjiReadingListResSchema) {}
