import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Custom validation functions for Languages
const isValidLanguageCode = (code: string): boolean => {
  // Language codes should be 2-3 characters (ISO 639-1 or ISO 639-2)
  const languageCodeRegex = /^[a-z]{2,3}$/
  return languageCodeRegex.test(code)
}

const isValidLanguageName = (name: string): boolean => {
  // Language names should contain letters (including Unicode), spaces, hyphens, and dots
  // This allows for international language names like "日本語", "Tiếng Việt", etc.
  const nameRegex = /^[\p{L}\s\-\.]+$/u
  return nameRegex.test(name)
}

// Custom error messages
const LANGUAGE_CODE_ERROR =
  'Mã ngôn ngữ phải là 2-3 ký tự chữ cái thường (ISO 639-1/639-2)'
const LANGUAGE_NAME_ERROR =
  'Tên ngôn ngữ chỉ được chứa chữ cái (bao gồm Unicode), khoảng trắng, dấu gạch ngang và dấu chấm'

export const LanguagesSchema = z.object({
  id: z.number(),
  code: z
    .string()
    .min(2, 'Mã ngôn ngữ phải có ít nhất 2 ký tự')
    .max(10, 'Mã ngôn ngữ quá dài (tối đa 10 ký tự)')
    .refine(isValidLanguageCode, {
      message: LANGUAGE_CODE_ERROR
    }),
  name: z
    .string()
    .min(1, 'Tên ngôn ngữ không được để trống')
    .max(100, 'Tên ngôn ngữ quá dài (tối đa 100 ký tự)')
    .refine(isValidLanguageName, {
      message: LANGUAGE_NAME_ERROR
    }),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateLanguagesSchema = z.object({
  id: z.number().optional(),
  code: z
    .string()
    .min(2, 'Mã ngôn ngữ phải có ít nhất 2 ký tự')
    .max(10, 'Mã ngôn ngữ quá dài (tối đa 10 ký tự)')
    .refine(isValidLanguageCode, {
      message: LANGUAGE_CODE_ERROR
    }),
  name: z
    .string()
    .min(1, 'Tên ngôn ngữ không được để trống')
    .max(100, 'Tên ngôn ngữ quá dài (tối đa 100 ký tự)')
    .refine(isValidLanguageName, {
      message: LANGUAGE_NAME_ERROR
    }),
  flag: z.string().optional()
})

export const UpdateLanguagesSchema = z.object({
  code: z
    .string()
    .min(2, 'Mã ngôn ngữ phải có ít nhất 2 ký tự')
    .max(10, 'Mã ngôn ngữ quá dài (tối đa 10 ký tự)')
    .refine(isValidLanguageCode, {
      message: LANGUAGE_CODE_ERROR
    })
    .optional(),
  name: z
    .string()
    .min(1, 'Tên ngôn ngữ không được để trống')
    .max(100, 'Tên ngôn ngữ quá dài (tối đa 100 ký tự)')
    .refine(isValidLanguageName, {
      message: LANGUAGE_NAME_ERROR
    })
    .optional()
})

export const GetLanguagesByIdParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10))
})

export const GetLanguagesListQuerySchema = z.object({
  currentPage: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('1'),
  pageSize: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('10'),
  search: z.string().optional(),
  code: z.string().optional()
})

export const GetLanguagesByCodeParamsSchema = z.object({
  code: z.string().min(2, 'Mã ngôn ngữ không được để trống')
})

// List Response Schema (internal use)
export const LanguagesListResponseSchema = z.object({
  data: z.array(LanguagesSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number()
})

// Standard Response Schemas (like vocabulary pattern)
export const LanguagesResSchema = z
  .object({
    statusCode: z.number(),
    data: LanguagesSchema,
    message: z.string()
  })
  .strict()

export const LanguagesListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(LanguagesSchema),
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
export type LanguagesType = z.infer<typeof LanguagesSchema>
export type CreateLanguagesBodyType = z.infer<typeof CreateLanguagesSchema>
export type UpdateLanguagesBodyType = z.infer<typeof UpdateLanguagesSchema>
export type GetLanguagesByIdParamsType = z.infer<typeof GetLanguagesByIdParamsSchema>
export type GetLanguagesListQueryType = z.infer<typeof GetLanguagesListQuerySchema>
export type GetLanguagesByCodeParamsType = z.infer<typeof GetLanguagesByCodeParamsSchema>
export type LanguagesResType = z.infer<typeof LanguagesResSchema>
export type LanguagesListResType = z.infer<typeof LanguagesListResSchema>
