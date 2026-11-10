import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Custom validation functions for Meaning
const isValidTranslationKey = (key: string): boolean => {
  // Translation keys should follow pattern: module.id.field (e.g., meaning.1.definition)
  const keyRegex = /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)*$/
  return keyRegex.test(key)
}

const isValidJapaneseText = (text: string): boolean => {
  // Japanese text contains Hiragana, Katakana, Kanji, and some punctuation
  const japaneseRegex =
    /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF\uF900-\uFAFF\u2F800-\u2FA1F\s\-\.\,\!\?\'\"]/
  return japaneseRegex.test(text)
}

// Custom error messages
const TRANSLATION_KEY_ERROR =
  'Key dịch phải theo định dạng: module.id.field (ví dụ: meaning.1.definition)'
const JAPANESE_TEXT_ERROR =
  'Phải là văn bản tiếng Nhật (chứa Hiragana, Katakana, hoặc Kanji)'

export const MeaningSchema = z.object({
  id: z.number(),
  vocabularyId: z.number(),
  wordTypeId: z.number().nullable().optional(),
  meaningKey: z.string().nullable().optional(),
  exampleSentenceKey: z.string().nullable().optional(),
  explanationKey: z.string().nullable().optional(),
  exampleSentenceJp: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateMeaningSchema = z.object({
  vocabularyId: z.number().min(1, 'Vocabulary ID phải lớn hơn 0'),
  wordTypeId: z.number().min(1, 'WordType ID phải lớn hơn 0').optional(),
  exampleSentenceJp: z
    .string()
    .max(1000, 'Câu ví dụ tiếng Nhật quá dài (tối đa 1000 ký tự)')
    .refine((val) => !val || isValidJapaneseText(val), {
      message: JAPANESE_TEXT_ERROR
    })
    .optional()
})

// Schema cho service layer (bao gồm auto-generated keys)
export const CreateMeaningServiceSchema = z.object({
  vocabularyId: z.number().min(1, 'Vocabulary ID phải lớn hơn 0'),
  wordTypeId: z.number().min(1, 'WordType ID phải lớn hơn 0').optional(),
  meaningKey: z.string().optional(),
  exampleSentenceKey: z.string().optional(),
  explanationKey: z.string().optional(),
  exampleSentenceJp: z
    .string()
    .max(1000, 'Câu ví dụ tiếng Nhật quá dài (tối đa 1000 ký tự)')
    .refine((val) => !val || isValidJapaneseText(val), {
      message: JAPANESE_TEXT_ERROR
    })
    .optional()
})

export const UpdateMeaningSchema = z.object({
  vocabularyId: z.number().min(1, 'Vocabulary ID phải lớn hơn 0').optional(),
  wordTypeId: z.number().min(1, 'WordType ID phải lớn hơn 0').optional(),
  meaningKey: z
    .string()
    .min(1, 'Meaning key không được để trống')
    .max(500, 'Meaning key quá dài (tối đa 500 ký tự)')
    .refine(isValidTranslationKey, {
      message: TRANSLATION_KEY_ERROR
    })
    .optional(),
  exampleSentenceKey: z
    .string()
    .min(1, 'Example sentence key không được để trống')
    .max(500, 'Example sentence key quá dài (tối đa 500 ký tự)')
    .refine(isValidTranslationKey, {
      message: TRANSLATION_KEY_ERROR
    })
    .optional(),
  explanationKey: z
    .string()
    .min(1, 'Explanation key không được để trống')
    .max(500, 'Explanation key quá dài (tối đa 500 ký tự)')
    .refine(isValidTranslationKey, {
      message: TRANSLATION_KEY_ERROR
    })
    .optional(),
  exampleSentenceJp: z
    .string()
    .min(1, 'Câu ví dụ tiếng Nhật không được để trống')
    .max(1000, 'Câu ví dụ tiếng Nhật quá dài (tối đa 1000 ký tự)')
    .refine(isValidJapaneseText, {
      message: JAPANESE_TEXT_ERROR
    })
    .optional()
})

export const GetMeaningByIdParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10))
})

export const GetMeaningListQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('1'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('10'),
  search: z.string().optional(),
  vocabularyId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  wordTypeId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional()
})

export const GetMeaningsByVocabularyParamsSchema = z.object({
  vocabularyId: z.string().transform((val) => parseInt(val, 10))
})

// Response schemas
export const MeaningListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(MeaningSchema),
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
export type MeaningType = z.infer<typeof MeaningSchema>
export type CreateMeaningBodyType = z.infer<typeof CreateMeaningSchema>
export type CreateMeaningServiceType = z.infer<typeof CreateMeaningServiceSchema>
export type UpdateMeaningBodyType = z.infer<typeof UpdateMeaningSchema>
export type GetMeaningByIdParamsType = z.infer<typeof GetMeaningByIdParamsSchema>
export type GetMeaningListQueryType = z.infer<typeof GetMeaningListQuerySchema>
export type GetMeaningsByVocabularyParamsType = z.infer<
  typeof GetMeaningsByVocabularyParamsSchema
>
export type MeaningListResType = z.infer<typeof MeaningListResSchema>
