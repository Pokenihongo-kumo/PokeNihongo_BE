import { GrammarUsageSortField, SortOrder } from '@/common/enum/enum'
import { checkIdSchema } from '@/common/utils/id.validation'
import { GrammarUsageMessage } from '@/i18n/message-keys'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Request/Response Types

export const CreateGrammarUsageBodySchema = z.object({
  grammarId: z.number(),
  explanationKey: z.string().min(1).max(200),
  exampleSentenceJp: z.string().min(1).max(1000),
  exampleSentenceKey: z.string().min(1).max(200)
})

export type CreateGrammarUsageBody = z.infer<typeof CreateGrammarUsageBodySchema>

export class CreateGrammarUsageBodyDTO extends createZodDto(
  CreateGrammarUsageBodySchema
) {}

export const UpdateGrammarUsageBodySchema = z.object({
  explanationKey: z.string().min(1).max(200).optional(),
  exampleSentenceJp: z.string().min(1).max(1000).optional(),
  exampleSentenceKey: z.string().min(1).max(200).optional()
})

export type UpdateGrammarUsageBody = z.infer<typeof UpdateGrammarUsageBodySchema>

export class UpdateGrammarUsageBodyDTO extends createZodDto(
  UpdateGrammarUsageBodySchema
) {}

export const GetGrammarUsageByIdParamsSchema = z.object({
  id: checkIdSchema(GrammarUsageMessage.INVALID_ID)
})

export type GetGrammarUsageByIdParams = z.infer<typeof GetGrammarUsageByIdParamsSchema>

export class GetGrammarUsageByIdParamsDTO extends createZodDto(
  GetGrammarUsageByIdParamsSchema
) {}

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

export type GetGrammarUsageListQuery = z.infer<typeof GetGrammarUsageListQuerySchema>

export class GetGrammarUsageListQueryDTO extends createZodDto(
  GetGrammarUsageListQuerySchema
) {}
