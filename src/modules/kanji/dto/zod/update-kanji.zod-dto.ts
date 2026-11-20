import { createZodDto } from 'nestjs-zod'
import {
  UpdateKanjiWithMeaningsSchema,
  UpdateKanjiWithMeaningsResSchema
} from '../update-kanji-with-meanings.dto'

// Zod DTOs - automatically validated
export class UpdateKanjiWithMeaningsBodyDTO extends createZodDto(
  UpdateKanjiWithMeaningsSchema
) {}
export class UpdateKanjiWithMeaningsResDTO extends createZodDto(
  UpdateKanjiWithMeaningsResSchema
) {}
