import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { AnswerListResSchema, AnswerSchema } from '../entities/answer.entity'

// Extended Answer type with translations
const AnswerWithTranslationsType = AnswerSchema.extend({
  translations: z
    .object({
      meaning: z.array(
        z.object({
          language_code: z.string(),
          value: z.string()
        })
      )
    })
    .optional()
})

// Response DTOs
export const AnswerResponseSchema = resSchema(AnswerWithTranslationsType)

// Use the schema from entities that matches vocabulary/lesson pattern
export const AnswerListResponseSchema = AnswerListResSchema

export class AnswerResponseDTO extends createZodDto(AnswerResponseSchema) {}
export class AnswerListResponseDTO extends createZodDto(AnswerListResponseSchema) {}
