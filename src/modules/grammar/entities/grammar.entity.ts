import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { GrammarSortField, SortOrder } from '@/common/enum/enum'

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
    .min(1, 'Cấu trúc ngữ pháp không được để trống')
    .max(500, 'Cấu trúc ngữ pháp không được vượt quá 500 ký tự'),
  level: z
    .string()
    .min(1, 'Cấp độ không được để trống')
    .max(10, 'Cấp độ không được vượt quá 10 ký tự'),
  usage: z
    .object({
      exampleSentenceJp: z
        .string()
        .min(1, 'Câu ví dụ tiếng Nhật không được để trống')
        .max(1000, 'Câu ví dụ tiếng Nhật không được vượt quá 1000 ký tự')
    })
    .optional(),
  translations: z
    .object({
      usage: z
        .array(
          z.object({
            language_code: z
              .string()
              .min(2, 'Mã ngôn ngữ phải có ít nhất 2 ký tự')
              .max(5, 'Mã ngôn ngữ không được vượt quá 5 ký tự'),
            explanation: z
              .string()
              .min(1, 'Giải thích không được để trống')
              .max(2000, 'Giải thích không được vượt quá 2000 ký tự'),
            example: z
              .string()
              .min(1, 'Ví dụ không được để trống')
              .max(1000, 'Ví dụ không được vượt quá 1000 ký tự')
          })
        )
        .optional()
    })
    .optional()
})

export const UpdateGrammarBodyType = z.object({
  structure: z
    .string()
    .min(1, 'Cấu trúc ngữ pháp không được để trống')
    .max(500, 'Cấu trúc ngữ pháp không được vượt quá 500 ký tự')
    .optional(),
  level: z
    .string()
    .min(1, 'Cấp độ không được để trống')
    .max(10, 'Cấp độ không được vượt quá 10 ký tự')
    .optional()
})

export const CreateGrammarBasicBodyType = z.object({
  structure: z
    .string()
    .min(1, 'Cấu trúc ngữ pháp không được để trống')
    .max(500, 'Cấu trúc ngữ pháp không được vượt quá 500 ký tự'),
  level: z
    .string()
    .min(1, 'Cấp độ không được để trống')
    .max(10, 'Cấp độ không được vượt quá 10 ký tự')
})

export const GetGrammarByIdParamsType = z.object({
  id: z.string().transform(Number)
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
