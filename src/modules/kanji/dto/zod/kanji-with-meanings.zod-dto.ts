import { createZodDto } from 'nestjs-zod'
import {
  CreateKanjiWithMeaningsSchema,
  KanjiWithMeaningsResSchema
} from '../kanji-with-meanings.dto'

// Zod DTOs - automatically validated
export class CreateKanjiWithMeaningsBodyDTO extends createZodDto(
  CreateKanjiWithMeaningsSchema
) {}
export class KanjiWithMeaningsResDTO extends createZodDto(KanjiWithMeaningsResSchema) {}
