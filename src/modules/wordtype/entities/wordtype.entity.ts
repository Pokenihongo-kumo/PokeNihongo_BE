import { z } from 'zod'

// Validation functions
export const isValidTranslationKey = (key: string): boolean => {
  // Translation key pattern: wordtype.1.name, wordtype.1.description, etc.
  const translationKeyRegex = /^[a-zA-Z][a-zA-Z0-9._-]*$/
  return translationKeyRegex.test(key)
}

export const TRANSLATION_KEY_ERROR =
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

// Response schemas
// View schema for responses: expose translated value as `name`
export const WordTypeViewSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Type exports
export type WordType = z.infer<typeof WordTypeSchema>
