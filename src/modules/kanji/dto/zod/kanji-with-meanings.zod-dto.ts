import { createZodDto } from 'nestjs-zod'
import {
  CreateKanjiWithMeaningsSchema,
  KanjiWithMeaningsResponseSchema,
  KanjiWithMeaningsResSchema
} from '../kanji-with-meanings.dto'

// Zod DTOs - automatically validated
export class CreateKanjiWithMeaningsBodyDTO extends createZodDto(
  CreateKanjiWithMeaningsSchema
) {}
export class KanjiWithMeaningsResponseDTO extends createZodDto(
  KanjiWithMeaningsResponseSchema
) {}
export class KanjiWithMeaningsResDTO extends createZodDto(KanjiWithMeaningsResSchema) {}
