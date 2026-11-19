import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Grammar Usage Entity Types
export const GrammarUsageSchema = z.object({
  id: z.number(),
  grammarId: z.number(),
  explanationKey: z.string(),
  exampleSentenceJp: z.string(),
  exampleSentenceKey: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const GrammarUsageWithGrammarSchema = GrammarUsageSchema.extend({
  grammar: z
    .object({
      id: z.number(),
      structure: z.string(),
      level: z.string()
    })
    .optional()
})

// Type exports
export type GrammarUsage = z.infer<typeof GrammarUsageSchema>
export type GrammarUsageWithGrammar = z.infer<typeof GrammarUsageWithGrammarSchema>
