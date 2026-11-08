import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { checkIdSchema } from '@/common/utils/id.validation'
import { LanguagesMessage } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
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

export const LanguagesSchema = z.object({
  id: z.number(),
  code: z
    .string()
    .min(2, LanguagesMessage.CODE_TOO_SHORT)
    .max(10, LanguagesMessage.CODE_TOO_LONG)
    .refine(isValidLanguageCode, {
      message: LanguagesMessage.CODE_INVALID
    }),
  name: z
    .string()
    .min(1, LanguagesMessage.NAME_REQUIRED)
    .max(100, LanguagesMessage.NAME_TOO_LONG)
    .refine(isValidLanguageName, {
      message: LanguagesMessage.NAME_INVALID
    }),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateLanguagesSchema = z.object({
  id: z.number().optional(),
  code: z
    .string()
    .min(2, LanguagesMessage.CODE_TOO_SHORT)
    .max(10, LanguagesMessage.CODE_TOO_LONG)
    .refine(isValidLanguageCode, {
      message: LanguagesMessage.CODE_INVALID
    }),
  name: z
    .string()
    .min(1, LanguagesMessage.NAME_REQUIRED)
    .max(100, LanguagesMessage.NAME_TOO_LONG)
    .refine(isValidLanguageName, {
      message: LanguagesMessage.NAME_INVALID
    }),
  flag: z.string().optional()
})

export const UpdateLanguagesSchema = z.object({
  code: z
    .string()
    .min(2, LanguagesMessage.CODE_TOO_SHORT)
    .max(10, LanguagesMessage.CODE_TOO_LONG)
    .refine(isValidLanguageCode, {
      message: LanguagesMessage.CODE_INVALID
    })
    .optional(),
  name: z
    .string()
    .min(1, LanguagesMessage.NAME_REQUIRED)
    .max(100, LanguagesMessage.NAME_TOO_LONG)
    .refine(isValidLanguageName, {
      message: LanguagesMessage.NAME_INVALID
    })
    .optional()
})

export const GetLanguagesByIdParamsSchema = z.object({
  id: checkIdSchema(LanguagesMessage.INVALID_ID)
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
  code: z.string().min(2, LanguagesMessage.CODE_REQUIRED)
})

// Standard Response Schemas (like vocabulary pattern)
export const LanguagesResSchema = z
  .object({
    statusCode: z.number(),
    data: LanguagesSchema,
    message: z.string()
  })
  .strict()

export const LanguagesListResSchema = paginatedResSchema(LanguagesSchema)

// Type exports
export type LanguagesType = z.infer<typeof LanguagesSchema>
export type CreateLanguagesBodyType = z.infer<typeof CreateLanguagesSchema>
export type UpdateLanguagesBodyType = z.infer<typeof UpdateLanguagesSchema>
export type GetLanguagesByIdParamsType = z.infer<typeof GetLanguagesByIdParamsSchema>
export type GetLanguagesListQueryType = z.infer<typeof GetLanguagesListQuerySchema>
export type GetLanguagesByCodeParamsType = z.infer<typeof GetLanguagesByCodeParamsSchema>
export type LanguagesResType = z.infer<typeof LanguagesResSchema>
export type LanguagesListResType = z.infer<typeof LanguagesListResSchema>
