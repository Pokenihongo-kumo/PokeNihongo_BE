import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateKanjiWithMeaningsSchema,
  KanjiWithMeaningsResSchema
} from '../kanji-with-meanings.dto'

// Zod DTOs - automatically validated

export type CreateKanjiWithMeaningsBody = z.infer<typeof CreateKanjiWithMeaningsSchema>

export class CreateKanjiWithMeaningsBodyDTO extends createZodDto(
  CreateKanjiWithMeaningsSchema
) {}

export type KanjiWithMeaningsRes = z.infer<typeof KanjiWithMeaningsResSchema>

export class KanjiWithMeaningsResDTO extends createZodDto(KanjiWithMeaningsResSchema) {}
