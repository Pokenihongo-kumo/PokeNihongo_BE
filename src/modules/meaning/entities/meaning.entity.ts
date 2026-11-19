import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

export const MeaningSchema = z.object({
  id: z.number(),
  vocabularyId: z.number(),
  wordTypeId: z.number().nullable().optional(),
  meaningKey: z.string().nullable().optional(),
  exampleSentenceKey: z.string().nullable().optional(),
  explanationKey: z.string().nullable().optional(),
  exampleSentenceJp: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// The detail route adds the translations of meaningKey and exampleSentenceKey
const TranslationItemSchema = z.object({ language_code: z.string(), value: z.string() })
export const MeaningWithTranslationsSchema = MeaningSchema.extend({
  meaningTranslations: z.array(TranslationItemSchema),
  exampleTranslations: z.array(TranslationItemSchema)
})

export type Meaning = z.infer<typeof MeaningSchema>
export type MeaningWithTranslations = z.infer<typeof MeaningWithTranslationsSchema>
