import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { GrammarUsageWithGrammarType } from '../entities/grammar-usage.entity'

// statusCode is part of the envelope: without it the serializer dropped it
export const GrammarUsageWithGrammarResponseSchema = resSchema(
  GrammarUsageWithGrammarType
)

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
