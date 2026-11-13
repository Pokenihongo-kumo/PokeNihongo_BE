import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { VocabularySortField, VocabularySortOrder } from '@/common/enum/enum'

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

export const CreateVocabularyBodySchema = VocabularySchema.pick({
  wordJp: true,
  reading: true,
  imageUrl: true,
  audioUrl: true
}).strict()

export const UpdateVocabularyBodySchema = VocabularySchema.pick({
  wordJp: true,
  reading: true,
  imageUrl: true,
  audioUrl: true
})
  .partial()
  .strict()

export const VocabularyResSchema = z
  .object({
    statusCode: z.number(),
    data: VocabularySchema,
    message: z.string()
  })
  .strict()

export const VocabularyListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(VocabularySchema),
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

export const GetVocabularyByIdParamsSchema = z
  .object({
    id: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

export const GetVocabularyListQuerySchema = z
  .object({
    currentPage: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('1'),
    pageSize: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('10'),
    search: z.string().optional(),
    levelN: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    lessonId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    sortBy: z
      .nativeEnum(VocabularySortField)
      .optional()
      .default(VocabularySortField.CREATED_AT),
    sort: z.nativeEnum(VocabularySortOrder).optional().default(VocabularySortOrder.DESC)
  })
  .strict()

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

export const VocabularyStatisticsResSchema = z
  .object({
    statusCode: z.number(),
    data: VocabularyStatisticsSchema,
    message: z.string()
  })
  .strict()

// Search Schema
export const VocabularySearchItemSchema = z.object({
  id: z.number(),
  wordJp: z.string(),
  reading: z.string(),
  meaning: z.string()
})

export const VocabularySearchQuerySchema = z
  .object({
    keyword: z.string().min(1, 'Từ khóa tìm kiếm không được để trống'),
    currentPage: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('1'),
    pageSize: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('20')
  })
  .strict()

export const VocabularySearchResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(VocabularySearchItemSchema),
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

export const VocabularyDetailResSchema = z
  .object({
    statusCode: z.number(),
    data: VocabularyDetailSchema,
    message: z.string()
  })
  .strict()

// Search History Schema
export const VocabularySearchHistoryItemSchema = z.object({
  id: z.number(),
  searchKeyword: z.string(),
  createdAt: z.date()
})

export const VocabularySearchHistoryQuerySchema = z
  .object({
    currentPage: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('1'),
    pageSize: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('20')
  })
  .strict()

export const VocabularySearchHistoryResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(VocabularySearchHistoryItemSchema),
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

// Types
export type VocabularyType = z.infer<typeof VocabularySchema>
export type CreateVocabularyBodyType = z.infer<typeof CreateVocabularyBodySchema>
export type UpdateVocabularyBodyType = z.infer<typeof UpdateVocabularyBodySchema>
export type VocabularyResType = z.infer<typeof VocabularyResSchema>
export type VocabularyListResType = z.infer<typeof VocabularyListResSchema>
export type GetVocabularyByIdParamsType = z.infer<typeof GetVocabularyByIdParamsSchema>
export type GetVocabularyListQueryType = z.infer<typeof GetVocabularyListQuerySchema>
export type VocabularyStatisticsType = z.infer<typeof VocabularyStatisticsSchema>
export type VocabularyStatisticsResType = z.infer<typeof VocabularyStatisticsResSchema>
export type VocabularySearchItemType = z.infer<typeof VocabularySearchItemSchema>
export type VocabularySearchQueryType = z.infer<typeof VocabularySearchQuerySchema>
export type VocabularySearchResType = z.infer<typeof VocabularySearchResSchema>
export type VocabularyMeaningDetailType = z.infer<typeof VocabularyMeaningDetailSchema>
export type VocabularyDetailType = z.infer<typeof VocabularyDetailSchema>
export type VocabularyDetailResType = z.infer<typeof VocabularyDetailResSchema>
export type VocabularySearchHistoryItemType = z.infer<
  typeof VocabularySearchHistoryItemSchema
>
export type VocabularySearchHistoryQueryType = z.infer<
  typeof VocabularySearchHistoryQuerySchema
>
export type VocabularySearchHistoryResType = z.infer<
  typeof VocabularySearchHistoryResSchema
>
