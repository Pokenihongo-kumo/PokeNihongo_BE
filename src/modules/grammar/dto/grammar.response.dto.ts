import { z } from 'zod'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { GrammarSchema } from '../entities/grammar.entity'

// statusCode is part of the envelope: without it the serializer dropped it
export const GrammarResponseSchema = resSchema(GrammarSchema)

export type GrammarResponse = z.infer<typeof GrammarResponseSchema>

export class GrammarResponseDTO extends createZodDto(GrammarResponseSchema) {}

export const GrammarListResSchema = paginatedResSchema(GrammarSchema)

export type GrammarListRes = z.infer<typeof GrammarListResSchema>

export class GrammarListResDTO extends createZodDto(GrammarListResSchema) {}

const UsageTranslationSchema = z.object({ language_code: z.string(), value: z.string() })

// Detail: each usage with its grammar row and the translations of its keys
export const GrammarDetailResSchema = resSchema(
  GrammarSchema.extend({
    usages: z.array(
      z.object({
        id: z.number(),
        grammarId: z.number(),
        explanationKey: z.string(),
        exampleSentenceJp: z.string(),
        exampleSentenceKey: z.string(),
        createdAt: z.date(),
        updatedAt: z.date(),
        grammar: GrammarSchema,
        explanationTranslations: z.array(UsageTranslationSchema),
        exampleTranslations: z.array(UsageTranslationSchema)
      })
    )
  })
)

export type GrammarDetailRes = z.infer<typeof GrammarDetailResSchema>

export class GrammarDetailResDTO extends createZodDto(GrammarDetailResSchema) {}
