import { GrammarUsageSortField, SortOrder } from '@/common/enum/enum'
import { checkIdSchema } from '@/common/utils/id.validation'
import { GrammarUsageMessage } from '@/i18n/message-keys'
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

// Request/Response Types
export const CreateGrammarUsageBodySchema = z.object({
  grammarId: z.number(),
  explanationKey: z.string().min(1).max(200),
  exampleSentenceJp: z.string().min(1).max(1000),
  exampleSentenceKey: z.string().min(1).max(200)
})

export const UpdateGrammarUsageBodySchema = z.object({
  explanationKey: z.string().min(1).max(200).optional(),
  exampleSentenceJp: z.string().min(1).max(1000).optional(),
  exampleSentenceKey: z.string().min(1).max(200).optional()
})

export const GetGrammarUsageByIdParamsSchema = z.object({
  id: checkIdSchema(GrammarUsageMessage.INVALID_ID)
})

export const GetGrammarUsageListQuerySchema = z.object({
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
export type GrammarUsage = z.infer<typeof GrammarUsageSchema>
export type GrammarUsageWithGrammar = z.infer<typeof GrammarUsageWithGrammarSchema>
export type CreateGrammarUsageBody = z.infer<typeof CreateGrammarUsageBodySchema>
export type UpdateGrammarUsageBody = z.infer<typeof UpdateGrammarUsageBodySchema>
export type GetGrammarUsageByIdParams = z.infer<typeof GetGrammarUsageByIdParamsSchema>
export type GetGrammarUsageListQuery = z.infer<typeof GetGrammarUsageListQuerySchema>
