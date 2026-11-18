import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { GrammarSchema } from '../entities/grammar.entity'

// statusCode is part of the envelope: without it the serializer dropped it
export const GrammarResponseSchema = resSchema(GrammarSchema)

export class GrammarResponseDTO extends createZodDto(GrammarResponseSchema) {}
