import {
  CreateVocabularyBodySchema,
  GetVocabularyByIdParamsSchema,
  GetVocabularyListQuerySchema,
  UpdateVocabularyBodySchema,
  VocabularyListResSchema,
  VocabularyResSchema,
  VocabularyStatisticsResSchema,
  VocabularySearchQuerySchema,
  VocabularySearchResSchema,
  VocabularyDetailResSchema,
  VocabularySearchHistoryQuerySchema,
  VocabularySearchHistoryResSchema
} from '@/modules/vocabulary/entities/vocabulary.entities'
import { createZodDto } from 'nestjs-zod'

export class CreateVocabularyBodyDTO extends createZodDto(CreateVocabularyBodySchema) {}

export class UpdateVocabularyBodyDTO extends createZodDto(UpdateVocabularyBodySchema) {}

export class GetVocabularyByIdParamsDTO extends createZodDto(
  GetVocabularyByIdParamsSchema
) {}

export class GetVocabularyListQueryDTO extends createZodDto(
  GetVocabularyListQuerySchema
) {}

export class VocabularyResDTO extends createZodDto(VocabularyResSchema) {}

export class VocabularyListResDTO extends createZodDto(VocabularyListResSchema) {}

export class VocabularyStatisticsResDTO extends createZodDto(
  VocabularyStatisticsResSchema
) {}

export class VocabularySearchQueryDTO extends createZodDto(VocabularySearchQuerySchema) {}

export class VocabularySearchResDTO extends createZodDto(VocabularySearchResSchema) {}

export class VocabularyDetailResDTO extends createZodDto(VocabularyDetailResSchema) {}

export class VocabularySearchHistoryQueryDTO extends createZodDto(
  VocabularySearchHistoryQuerySchema
) {}

export class VocabularySearchHistoryResDTO extends createZodDto(
  VocabularySearchHistoryResSchema
) {}
