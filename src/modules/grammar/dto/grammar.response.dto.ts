import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { GrammarType } from '../entities/grammar.entity'

// statusCode is part of the envelope: without it the serializer dropped it
export const GrammarResponseSchema = resSchema(GrammarType)

export class GrammarResponseDTO extends createZodDto(GrammarResponseSchema) {}
