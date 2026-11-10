import { paginatedResSchema } from '@/shared/utils/pagination'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { GrammarUsageWithGrammarType } from '../entities/grammar-usage.entity'

// statusCode is part of the envelope: without it the serializer dropped it
export const GrammarUsageWithGrammarResponseSchema = z.object({
  statusCode: z.number(),
  data: GrammarUsageWithGrammarType,
  message: z.string()
})

// { results, pagination } like every list (was { data[], total, page, limit, totalPages })
export const GrammarUsageListResponseSchema = paginatedResSchema(
  GrammarUsageWithGrammarType
)

export class GrammarUsageWithGrammarResponseDTO extends createZodDto(
  GrammarUsageWithGrammarResponseSchema
) {}
export class GrammarUsageListResponseDTO extends createZodDto(
  GrammarUsageListResponseSchema
) {}
