import { createZodDto } from 'nestjs-zod'
import {
  CreateMeaningSchema,
  GetMeaningByIdParamsSchema,
  GetMeaningListQuerySchema,
  GetMeaningsByVocabularyParamsSchema,
  MeaningListResSchema,
  MeaningResSchema,
  UpdateMeaningSchema
} from '../entities/meaning.entity'

export class CreateMeaningBodyDTO extends createZodDto(CreateMeaningSchema) {}
export class UpdateMeaningBodyDTO extends createZodDto(UpdateMeaningSchema) {}
export class GetMeaningByIdParamsDTO extends createZodDto(GetMeaningByIdParamsSchema) {}
export class GetMeaningsByVocabularyParamsDTO extends createZodDto(
  GetMeaningsByVocabularyParamsSchema
) {}
export class GetMeaningListQueryDTO extends createZodDto(GetMeaningListQuerySchema) {}
export class MeaningResDTO extends createZodDto(MeaningResSchema) {}
export class MeaningListResDTO extends createZodDto(MeaningListResSchema) {}
