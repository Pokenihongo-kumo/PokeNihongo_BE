import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { TranslationSortField, SortOrder } from '@/common/enum/enum'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Custom validation functions for Translation
const isValidLanguageCode = (code: string): boolean => {
  // Language codes should be 2-3 characters (ISO 639-1 or ISO 639-2)
  const languageCodeRegex = /^[a-z]{2,3}$/
  return languageCodeRegex.test(code)
}

const isValidTranslationKey = (key: string): boolean => {
  // Translation keys should follow pattern: module.id.field (e.g., lesson.1.title)
  const keyRegex = /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)*$/
  return keyRegex.test(key)
}

// Custom error messages
const LANGUAGE_CODE_ERROR =
  'Mã ngôn ngữ phải là 2-3 ký tự chữ cái thường (ISO 639-1/639-2)'
const TRANSLATION_KEY_ERROR =
  'Key dịch phải theo định dạng: module.id.field (ví dụ: lesson.1.title)'

export const TranslationSchema = z.object({
  id: z.number(),
  languageId: z.number().min(1, 'Language ID phải lớn hơn 0'),
  key: z
    .string()
    .min(1, 'Key dịch không được để trống')
    .max(500, 'Key dịch quá dài (tối đa 500 ký tự)')
    .refine(isValidTranslationKey, {
      message: TRANSLATION_KEY_ERROR
    }),
  value: z
    .string()
    .min(1, 'Nội dung dịch không được để trống')
    .max(2000, 'Nội dung dịch quá dài (tối đa 2000 ký tự)'),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateTranslationSchema = z.object({
  languageId: z.number().min(1, 'Language ID phải lớn hơn 0'),
  key: z
    .string()
    .min(1, 'Key dịch không được để trống')
    .max(500, 'Key dịch quá dài (tối đa 500 ký tự)')
    .refine(isValidTranslationKey, {
      message: TRANSLATION_KEY_ERROR
    }),
  value: z
    .string()
    .min(1, 'Nội dung dịch không được để trống')
    .max(2000, 'Nội dung dịch quá dài (tối đa 2000 ký tự)')
})

export const UpdateTranslationSchema = z.object({
  languageId: z.number().min(1, 'Language ID phải lớn hơn 0').optional(),
  key: z
    .string()
    .min(1, 'Key dịch không được để trống')
    .max(500, 'Key dịch quá dài (tối đa 500 ký tự)')
    .refine(isValidTranslationKey, {
      message: TRANSLATION_KEY_ERROR
    })
    .optional(),
  value: z
    .string()
    .min(1, 'Nội dung dịch không được để trống')
    .max(2000, 'Nội dung dịch quá dài (tối đa 2000 ký tự)')
    .optional()
})

export const GetTranslationByIdParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10))
})

export const GetTranslationListQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('1'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('10'),
  search: z.string().optional(),
  languageId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  key: z.string().optional(),
  sortBy: z
    .nativeEnum(TranslationSortField)
    .optional()
    .default(TranslationSortField.CREATED_AT),
  sort: z.nativeEnum(SortOrder).optional().default(SortOrder.DESC)
})

export const GetTranslationsByKeyQuerySchema = z.object({
  key: z.string().min(1, 'Key dịch không được để trống')
})

export const GetTranslationsByLanguageQuerySchema = z.object({
  languageId: z.string().transform((val) => parseInt(val, 10)),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('1'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('10')
})

// List Response Schema (internal use)
export const TranslationListResponseSchema = z.object({
  data: z.array(TranslationSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number()
})

// Standard Response Schemas (like vocabulary pattern)
export const TranslationResSchema = z
  .object({
    statusCode: z.number(),
    data: TranslationSchema,
    message: z.string()
  })
  .strict()

export const TranslationListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(TranslationSchema),
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
export type TranslationType = z.infer<typeof TranslationSchema>
export type CreateTranslationBodyType = z.infer<typeof CreateTranslationSchema>
export type UpdateTranslationBodyType = z.infer<typeof UpdateTranslationSchema>
export type GetTranslationByIdParamsType = z.infer<typeof GetTranslationByIdParamsSchema>
export type GetTranslationListQueryType = z.infer<typeof GetTranslationListQuerySchema>
export type GetTranslationsByKeyQueryType = z.infer<
  typeof GetTranslationsByKeyQuerySchema
>
export type GetTranslationsByLanguageQueryType = z.infer<
  typeof GetTranslationsByLanguageQuerySchema
>
export type TranslationResType = z.infer<typeof TranslationResSchema>
export type TranslationListResType = z.infer<typeof TranslationListResSchema>
