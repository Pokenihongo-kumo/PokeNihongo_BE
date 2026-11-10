import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { GrammarType } from '../entities/grammar.entity'

// statusCode is part of the envelope: without it the serializer dropped it
export const GrammarResponseSchema = z.object({
  statusCode: z.number(),
  data: GrammarType,
  message: z.string()
})

export class GrammarResponseDTO extends createZodDto(GrammarResponseSchema) {}
