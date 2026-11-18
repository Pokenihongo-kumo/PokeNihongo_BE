import { GrammarSortField, SortOrder } from '@/common/enum/enum'
import { checkIdSchema } from '@/common/utils/id.validation'
import { GrammarMessage } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { GrammarSchema } from '../entities/grammar.entity'

// Request/Response Types

export const CreateGrammarBodySchema = z.object({
  structure: z
    .string()
    .min(1, GrammarMessage.STRUCTURE_REQUIRED)
    .max(500, GrammarMessage.STRUCTURE_TOO_LONG),
  level: z
    .string()
    .min(1, GrammarMessage.LEVEL_REQUIRED)
    .max(10, GrammarMessage.LEVEL_TOO_LONG),
  usage: z
    .object({
      exampleSentenceJp: z
        .string()
        .min(1, GrammarMessage.EXAMPLE_JP_REQUIRED)
        .max(1000, GrammarMessage.EXAMPLE_JP_TOO_LONG)
    })
    .optional(),
  translations: z
    .object({
      usage: z
        .array(
          z.object({
            language_code: z
              .string()
              .min(2, GrammarMessage.LANGUAGE_CODE_TOO_SHORT)
              .max(5, GrammarMessage.LANGUAGE_CODE_TOO_LONG),
            explanation: z
              .string()
              .min(1, GrammarMessage.EXPLANATION_REQUIRED)
              .max(2000, GrammarMessage.EXPLANATION_TOO_LONG),
            example: z
              .string()
              .min(1, GrammarMessage.EXAMPLE_REQUIRED)
              .max(1000, GrammarMessage.EXAMPLE_TOO_LONG)
          })
        )
        .optional()
    })
    .optional()
})

export type CreateGrammarBody = z.infer<typeof CreateGrammarBodySchema>

export class CreateGrammarBodyDTO extends createZodDto(CreateGrammarBodySchema) {}

export const UpdateGrammarBodySchema = z.object({
  structure: z
    .string()
    .min(1, GrammarMessage.STRUCTURE_REQUIRED)
    .max(500, GrammarMessage.STRUCTURE_TOO_LONG)
    .optional(),
  level: z
    .string()
    .min(1, GrammarMessage.LEVEL_REQUIRED)
    .max(10, GrammarMessage.LEVEL_TOO_LONG)
    .optional()
})

export type UpdateGrammarBody = z.infer<typeof UpdateGrammarBodySchema>

export class UpdateGrammarBodyDTO extends createZodDto(UpdateGrammarBodySchema) {}

export const CreateGrammarBasicBodySchema = z.object({
  structure: z
    .string()
    .min(1, GrammarMessage.STRUCTURE_REQUIRED)
    .max(500, GrammarMessage.STRUCTURE_TOO_LONG),
  level: z
    .string()
    .min(1, GrammarMessage.LEVEL_REQUIRED)
    .max(10, GrammarMessage.LEVEL_TOO_LONG)
})

export type CreateGrammarBasicBody = z.infer<typeof CreateGrammarBasicBodySchema>

export class CreateGrammarBasicBodyDTO extends createZodDto(
  CreateGrammarBasicBodySchema
) {}

export const GetGrammarByIdParamsSchema = z.object({
  id: checkIdSchema(GrammarMessage.INVALID_ID)
})

export type GetGrammarByIdParams = z.infer<typeof GetGrammarByIdParamsSchema>

export class GetGrammarByIdParamsDTO extends createZodDto(GetGrammarByIdParamsSchema) {}

export const GetGrammarListQuerySchema = z.object({
  currentPage: z.string().transform(Number).default('1'),
  pageSize: z.string().transform(Number).default('10'),
  level: z.string().optional(),
  search: z.string().optional(),
  lessonId: z.string().transform(Number).optional(),
  sortBy: z.nativeEnum(GrammarSortField).optional().default(GrammarSortField.CREATED_AT),
  sort: z.nativeEnum(SortOrder).optional().default(SortOrder.DESC)
})

export type GetGrammarListQuery = z.infer<typeof GetGrammarListQuerySchema>

export class GetGrammarListQueryDTO extends createZodDto(GetGrammarListQuerySchema) {}

// Response schemas

export const GrammarListResSchema = paginatedResSchema(GrammarSchema).strict()

export type GrammarListRes = z.infer<typeof GrammarListResSchema>

export class GrammarListResDTO extends createZodDto(GrammarListResSchema) {}
