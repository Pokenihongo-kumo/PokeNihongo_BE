import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  GrammarUsageType,
  GrammarUsageWithGrammarType
} from '../entities/grammar-usage.entities'

export const GrammarUsageResponseSchema = z.object({
  data: GrammarUsageType,
  message: z.string()
})

export const GrammarUsageWithGrammarResponseSchema = z.object({
  data: GrammarUsageWithGrammarType,
  message: z.string()
})

export const GrammarUsageListResponseSchema = z.object({
  data: z.array(GrammarUsageType),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  message: z.string()
})

export class GrammarUsageResponseDTO extends createZodDto(GrammarUsageResponseSchema) {}
export class GrammarUsageWithGrammarResponseDTO extends createZodDto(
  GrammarUsageWithGrammarResponseSchema
) {}
export class GrammarUsageListResponseDTO extends createZodDto(
  GrammarUsageListResponseSchema
) {}
