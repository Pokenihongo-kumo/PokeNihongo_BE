import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { GrammarUsageWithGrammarSchema } from '../entities/grammar-usage.entity'

// statusCode is part of the envelope: without it the serializer dropped it
export const GrammarUsageWithGrammarResponseSchema = resSchema(
  GrammarUsageWithGrammarSchema
)

export class GrammarUsageWithGrammarResponseDTO extends createZodDto(
  GrammarUsageWithGrammarResponseSchema
) {}

// { results, pagination } like every list (was { data[], total, page, limit, totalPages })
export const GrammarUsageListResponseSchema = paginatedResSchema(
  GrammarUsageWithGrammarSchema
)

export class GrammarUsageListResponseDTO extends createZodDto(
  GrammarUsageListResponseSchema
) {}
