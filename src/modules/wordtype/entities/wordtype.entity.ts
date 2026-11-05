import { z } from 'zod'

// Validation functions
const isValidTranslationKey = (key: string): boolean => {
  // Translation key pattern: wordtype.1.name, wordtype.1.description, etc.
  const translationKeyRegex = /^[a-zA-Z][a-zA-Z0-9._-]*$/
  return translationKeyRegex.test(key)
}

const TRANSLATION_KEY_ERROR =
  'Translation key phải bắt đầu bằng chữ cái và chỉ chứa chữ cái, số, dấu chấm, gạch dưới, gạch ngang'

// Base WordType schema
export const WordTypeSchema = z.object({
  id: z.number(),
  nameKey: z
    .string()
    .min(1, 'Name key không được để trống')
    .max(100, 'Name key quá dài (tối đa 100 ký tự)')
    .refine(isValidTranslationKey, {
      message: TRANSLATION_KEY_ERROR
    }),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create WordType schema (cần nameKey, ID tùy chọn)
export const CreateWordTypeSchema = z.object({
  id: z.number().optional(),
  nameKey: z
    .string()
    .min(1, 'Name key không được để trống')
    .max(100, 'Name key quá dài (tối đa 100 ký tự)')
    .refine(isValidTranslationKey, {
      message: TRANSLATION_KEY_ERROR
    })
})

// Update WordType schema
export const UpdateWordTypeSchema = z.object({
  nameKey: z
    .string()
    .min(1, 'Name key không được để trống')
    .max(100, 'Name key quá dài (tối đa 100 ký tự)')
    .refine(isValidTranslationKey, {
      message: TRANSLATION_KEY_ERROR
    })
    .optional()
})

// Get WordType by ID params schema
export const GetWordTypeByIdParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10))
})

// Get WordType list query schema
export const GetWordTypeListQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  sortBy: z.enum(['id', 'nameKey', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
})

// Get WordType by nameKey params schema
export const GetWordTypeByNameKeyParamsSchema = z.object({
  nameKey: z.string().min(1, 'Name key không được để trống')
})

// Response schemas
// View schema for responses: expose translated value as `name`
export const WordTypeViewSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const WordTypeListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(WordTypeViewSchema),
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
export type WordType = z.infer<typeof WordTypeSchema>
export type CreateWordTypeBodyType = z.infer<typeof CreateWordTypeSchema>
export type UpdateWordTypeBodyType = z.infer<typeof UpdateWordTypeSchema>
export type GetWordTypeByIdParamsType = z.infer<typeof GetWordTypeByIdParamsSchema>
export type GetWordTypeListQueryType = z.infer<typeof GetWordTypeListQuerySchema>
export type GetWordTypeByNameKeyParamsType = z.infer<
  typeof GetWordTypeByNameKeyParamsSchema
>
export type WordTypeListResType = z.infer<typeof WordTypeListResSchema>
