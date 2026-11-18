import { TranslationMessage } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Segments start with a letter (module.field); see TRANSLATION_KEY_FORMAT
const isValidTranslationKey = (key: string): boolean =>
  /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)*$/.test(key)

export const languageId = z.number().min(1, TranslationMessage.LANGUAGE_ID_INVALID)
export const key = z
  .string()
  .min(1, TranslationMessage.KEY_REQUIRED)
  .max(500, TranslationMessage.KEY_TOO_LONG)
  .refine(isValidTranslationKey, { message: TranslationMessage.KEY_FORMAT })
export const value = z
  .string()
  .min(1, TranslationMessage.VALUE_REQUIRED)
  .max(2000, TranslationMessage.VALUE_TOO_LONG)

export const TranslationSchema = z.object({
  id: z.number(),
  languageId,
  key,
  value,
  createdAt: z.date(),
  updatedAt: z.date()
})

export type Translation = z.infer<typeof TranslationSchema>
