import { createZodDto } from 'nestjs-zod'
import {
  CreateMeaningSchema,
  UpdateMeaningSchema,
  GetMeaningByIdParamsSchema,
  GetMeaningListQuerySchema,
  MeaningSchema,
  MeaningListResSchema
} from '../entities/meaning.entity'

// Zod DTOs
export class CreateMeaningBodyDTO extends createZodDto(CreateMeaningSchema) {}
export class UpdateMeaningBodyDTO extends createZodDto(UpdateMeaningSchema) {}
export class GetMeaningByIdParamsDTO extends createZodDto(GetMeaningByIdParamsSchema) {}
export class GetMeaningListQueryDTO extends createZodDto(GetMeaningListQuerySchema) {}
export class MeaningResponseDTO extends createZodDto(MeaningSchema) {}
export class MeaningListResDTO extends createZodDto(MeaningListResSchema) {}
