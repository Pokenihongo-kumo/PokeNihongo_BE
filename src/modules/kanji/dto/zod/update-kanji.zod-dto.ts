import { createZodDto } from 'nestjs-zod'
import {
  UpdateKanjiWithMeaningsSchema,
  UpdateKanjiWithMeaningsResponseSchema,
  UpdateKanjiWithMeaningsResSchema
} from '../update-kanji-with-meanings.dto'

// Zod DTOs - automatically validated
export class UpdateKanjiWithMeaningsBodyDTO extends createZodDto(
  UpdateKanjiWithMeaningsSchema
) {}
export class UpdateKanjiWithMeaningsResponseDTO extends createZodDto(
  UpdateKanjiWithMeaningsResponseSchema
) {}
export class UpdateKanjiWithMeaningsResDTO extends createZodDto(
  UpdateKanjiWithMeaningsResSchema
) {}
