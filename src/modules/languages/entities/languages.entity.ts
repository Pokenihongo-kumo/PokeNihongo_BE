import { LanguagesMessage } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Custom validation functions for Languages
export const isValidLanguageCode = (code: string): boolean => {
  // Language codes should be 2-3 characters (ISO 639-1 or ISO 639-2)
  const languageCodeRegex = /^[a-z]{2,3}$/
  return languageCodeRegex.test(code)
}

export const isValidLanguageName = (name: string): boolean => {
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

// Type exports
export type Languages = z.infer<typeof LanguagesSchema>
