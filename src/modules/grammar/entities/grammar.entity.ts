import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { GrammarSortField, SortOrder } from '@/common/enum/enum'
import { checkIdSchema } from '@/common/utils/id.validation'
import { GrammarMessage } from '@/i18n/message-keys'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Grammar Entity Types
export const GrammarType = z.object({
  id: z.number(),
  structure: z.string(),
  level: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Request/Response Types
export const CreateGrammarBodyType = z.object({
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

export const UpdateGrammarBodyType = z.object({
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

export const CreateGrammarBasicBodyType = z.object({
  structure: z
    .string()
    .min(1, GrammarMessage.STRUCTURE_REQUIRED)
    .max(500, GrammarMessage.STRUCTURE_TOO_LONG),
  level: z
    .string()
    .min(1, GrammarMessage.LEVEL_REQUIRED)
    .max(10, GrammarMessage.LEVEL_TOO_LONG)
})

export const GetGrammarByIdParamsType = z.object({
  id: checkIdSchema(GrammarMessage.INVALID_ID)
})

export const GetGrammarListQueryType = z.object({
  currentPage: z.string().transform(Number).default('1'),
  pageSize: z.string().transform(Number).default('10'),
  level: z.string().optional(),
  search: z.string().optional(),
  lessonId: z.string().transform(Number).optional(),
  sortBy: z.nativeEnum(GrammarSortField).optional().default(GrammarSortField.CREATED_AT),
  sort: z.nativeEnum(SortOrder).optional().default(SortOrder.DESC)
})

// Response schemas
export const GrammarListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(GrammarType),
      pagination: z.object({
        current: z.number(),
        pageSize: z.number(),
        totalPage: z.number(),
        totalItem: z.number()
      })
    }),
    message: z.string()
  })
  .strict()

// Type exports
export type GrammarType = z.infer<typeof GrammarType>
export type CreateGrammarBodyType = z.infer<typeof CreateGrammarBodyType>
export type UpdateGrammarBodyType = z.infer<typeof UpdateGrammarBodyType>
export type CreateGrammarBasicBodyType = z.infer<typeof CreateGrammarBasicBodyType>
export type GetGrammarByIdParamsType = z.infer<typeof GetGrammarByIdParamsType>
export type GetGrammarListQueryType = z.infer<typeof GetGrammarListQueryType>
export type GrammarListResType = z.infer<typeof GrammarListResSchema>
