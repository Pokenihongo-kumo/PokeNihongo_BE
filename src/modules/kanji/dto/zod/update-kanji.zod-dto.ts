import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  UpdateKanjiWithMeaningsSchema,
  UpdateKanjiWithMeaningsResSchema
} from '../update-kanji-with-meanings.dto'

// Zod DTOs - automatically validated

export type UpdateKanjiWithMeaningsBody = z.infer<typeof UpdateKanjiWithMeaningsSchema>

export class UpdateKanjiWithMeaningsBodyDTO extends createZodDto(
  UpdateKanjiWithMeaningsSchema
) {}

export type UpdateKanjiWithMeaningsRes = z.infer<typeof UpdateKanjiWithMeaningsResSchema>

export class UpdateKanjiWithMeaningsResDTO extends createZodDto(
  UpdateKanjiWithMeaningsResSchema
) {}
