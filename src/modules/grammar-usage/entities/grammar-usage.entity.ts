import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { GrammarUsageSortField, SortOrder } from '@/common/enum/enum'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Grammar Usage Entity Types
export const GrammarUsageType = z.object({
  id: z.number(),
  grammarId: z.number(),
  explanationKey: z.string(),
  exampleSentenceJp: z.string(),
  exampleSentenceKey: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const GrammarUsageWithGrammarType = GrammarUsageType.extend({
  grammar: z
    .object({
      id: z.number(),
      structure: z.string(),
      level: z.string()
    })
    .optional()
})

// Request/Response Types
export const CreateGrammarUsageBodyType = z.object({
  grammarId: z.number(),
  explanationKey: z.string().min(1).max(200),
  exampleSentenceJp: z.string().min(1).max(1000),
  exampleSentenceKey: z.string().min(1).max(200)
})

export const UpdateGrammarUsageBodyType = z.object({
  explanationKey: z.string().min(1).max(200).optional(),
  exampleSentenceJp: z.string().min(1).max(1000).optional(),
  exampleSentenceKey: z.string().min(1).max(200).optional()
})

export const GetGrammarUsageByIdParamsType = z.object({
  id: z.string().transform(Number)
})

export const GetGrammarUsageListQueryType = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  grammarId: z.string().transform(Number).optional(),
  sortBy: z
    .nativeEnum(GrammarUsageSortField)
    .optional()
    .default(GrammarUsageSortField.CREATED_AT),
  sort: z.nativeEnum(SortOrder).optional().default(SortOrder.DESC)
})

// Type exports
export type GrammarUsageType = z.infer<typeof GrammarUsageType>
export type GrammarUsageWithGrammarType = z.infer<typeof GrammarUsageWithGrammarType>
export type CreateGrammarUsageBodyType = z.infer<typeof CreateGrammarUsageBodyType>
export type UpdateGrammarUsageBodyType = z.infer<typeof UpdateGrammarUsageBodyType>
export type GetGrammarUsageByIdParamsType = z.infer<typeof GetGrammarUsageByIdParamsType>
export type GetGrammarUsageListQueryType = z.infer<typeof GetGrammarUsageListQueryType>
