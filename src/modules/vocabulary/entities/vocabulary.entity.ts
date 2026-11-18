import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Custom validation functions for Japanese text
const isJapaneseText = (text: string): boolean => {
  // Japanese text contains ONLY Hiragana, Katakana, Kanji, and some punctuation
  // Must contain at least one Japanese character and no non-Japanese characters

  // Check if contains any non-Japanese characters (Latin, numbers, special chars)
  const hasNonJapanese = /[a-zA-Z0-9@#$%^&*()_+=\[\]{}|\\:";'<>?,./`~]/.test(text)

  if (hasNonJapanese) {
    return false
  }

  // Must contain at least one Japanese character (Hiragana, Katakana, Kanji)
  const japaneseRegex =
    /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF\uF900-\uFAFF\u2F800-\u2FA1F]/
  const hasJapanese = japaneseRegex.test(text)

  return hasJapanese
}

const isHiraganaText = (text: string): boolean => {
  // Hiragana contains only Hiragana characters and some punctuation
  const hiraganaRegex = /^[\u3040-\u309F\s\-\.\,\!\?\'\"]+$/
  return hiraganaRegex.test(text)
}

// Custom error messages
const JAPANESE_TEXT_ERROR =
  'Phải là văn bản tiếng Nhật thuần túy (CHỈ chứa Hiragana, Katakana, hoặc Kanji - không cho phép số hoặc ký tự Latin)'
const HIRAGANA_TEXT_ERROR =
  'Phải là cách đọc Hiragana (chỉ chứa ký tự Hiragana và dấu câu cơ bản)'

// WordType schema for nested relation
export const WordTypeSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  name: z.string().optional() // Resolved translation value
})

export const VocabularySchema = z.object({
  id: z.number(),
  wordJp: z
    .string()
    .min(1, 'Từ tiếng Nhật không được để trống')
    .max(500, 'Từ tiếng Nhật quá dài (tối đa 500 ký tự)')
    .refine(isJapaneseText, {
      message: JAPANESE_TEXT_ERROR
    }),
  reading: z
    .string()
    .min(1, 'Cách đọc không được để trống')
    .max(500, 'Cách đọc quá dài (tối đa 500 ký tự)'),
  imageUrl: z.string().url().nullable().optional(),
  audioUrl: z.string().url().nullable().optional(),
  levelN: z.number().min(1).max(5).nullable().optional(),
  wordType: WordTypeSchema.nullable().optional(),
  createdById: z.number().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Statistics Schema
export const VocabularyStatisticsSchema = z.object({
  totalVocabulary: z.number(),
  totalKanji: z.number(),
  vocabularyN5: z.number(),
  vocabularyN4: z.number(),
  vocabularyN3: z.number(),
  vocabularyN2: z.number(),
  vocabularyN1: z.number()
})

// Search Schema
export const VocabularySearchItemSchema = z.object({
  id: z.number(),
  wordJp: z.string(),
  reading: z.string(),
  meaning: z.string()
})

// Detail Schema (for search/:id)
export const VocabularyMeaningDetailSchema = z.object({
  id: z.number(),
  meaning: z.string(),
  exampleSentenceJp: z.string().nullable(),
  exampleSentence: z.string().nullable(),
  wordType: z.any().nullable().optional()
})

export const VocabularyDetailSchema = z.object({
  id: z.number(),
  wordJp: z.string(),
  reading: z.string(),
  audioUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  levelN: z.number().nullable(),
  wordType: z.string().nullable(),
  kanjiMeaning: z.string(),
  meanings: z.array(VocabularyMeaningDetailSchema),
  relatedWords: z.array(VocabularySearchItemSchema)
})

// Search History Schema
export const VocabularySearchHistoryItemSchema = z.object({
  id: z.number(),
  searchKeyword: z.string(),
  createdAt: z.date()
})

// Types
export type Vocabulary = z.infer<typeof VocabularySchema>
export type VocabularyStatistics = z.infer<typeof VocabularyStatisticsSchema>
export type VocabularySearchItem = z.infer<typeof VocabularySearchItemSchema>
export type VocabularyMeaningDetail = z.infer<typeof VocabularyMeaningDetailSchema>
export type VocabularyDetail = z.infer<typeof VocabularyDetailSchema>
export type VocabularySearchHistoryItem = z.infer<
  typeof VocabularySearchHistoryItemSchema
>
