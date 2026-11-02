import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { KanjiReadingSortField, SortOrder } from '@/common/enum/enum'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Custom validation functions for Kanji Reading
const isOnyomiKunyomi = (text: string): boolean => {
  // Onyomi and Kunyomi contain Hiragana, Katakana, and some punctuation
  const onyomiKunyomiRegex = /^[\u3040-\u309F\u30A0-\u30FF\s\-\.\,\!\?\'\"]+$/
  return onyomiKunyomiRegex.test(text)
}

const isValidReadingType = (readingType: string): boolean => {
  // Valid reading types: onyomi, kunyomi, nanori, etc.
  const validTypes = ['onyomi', 'kunyomi', 'nanori', 'irregular']
  return validTypes.includes(readingType.toLowerCase())
}

// Custom error messages
const ONYOMI_KUNYOMI_ERROR =
  'Phải là cách đọc Onyomi/Kunyomi (chỉ chứa Hiragana, Katakana và dấu câu cơ bản)'
const READING_TYPE_ERROR = 'Loại cách đọc phải là onyomi, kunyomi, nanori, hoặc irregular'

// Base Kanji Reading schema
export const KanjiReadingSchema = z.object({
  id: z.number(),
  kanjiId: z.number(),
  readingType: z
    .string()
    .min(1, 'Loại cách đọc không được để trống')
    .max(20, 'Loại cách đọc quá dài (tối đa 20 ký tự)')
    .refine(isValidReadingType, {
      message: READING_TYPE_ERROR
    }),
  reading: z
    .string()
    .min(1, 'Cách đọc không được để trống')
    .max(100, 'Cách đọc quá dài (tối đa 100 ký tự)')
    .refine(isOnyomiKunyomi, {
      message: ONYOMI_KUNYOMI_ERROR
    }),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Kanji Reading schema
export const CreateKanjiReadingSchema = z.object({
  kanjiId: z.number().min(1, 'Kanji ID phải lớn hơn 0'),
  readingType: z
    .string()
    .min(1, 'Loại cách đọc không được để trống')
    .max(20, 'Loại cách đọc quá dài (tối đa 20 ký tự)')
    .refine(isValidReadingType, {
      message: READING_TYPE_ERROR
    }),
  reading: z
    .string()
    .min(1, 'Cách đọc không được để trống')
    .max(100, 'Cách đọc quá dài (tối đa 100 ký tự)')
    .refine(isOnyomiKunyomi, {
      message: ONYOMI_KUNYOMI_ERROR
    })
})

// Update Kanji Reading schema
export const UpdateKanjiReadingSchema = z.object({
  readingType: z
    .string()
    .min(1, 'Loại cách đọc không được để trống')
    .max(20, 'Loại cách đọc quá dài (tối đa 20 ký tự)')
    .refine(isValidReadingType, {
      message: READING_TYPE_ERROR
    })
    .optional(),
  reading: z
    .string()
    .min(1, 'Cách đọc không được để trống')
    .max(100, 'Cách đọc quá dài (tối đa 100 ký tự)')
    .refine(isOnyomiKunyomi, {
      message: ONYOMI_KUNYOMI_ERROR
    })
    .optional()
})

// Get Kanji Reading by ID params schema
export const GetKanjiReadingByIdParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10))
})

// Get Kanji Reading list query schema
export const GetKanjiReadingListQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional()
    .default('1'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional()
    .default('10'),
  sortBy: z
    .nativeEnum(KanjiReadingSortField)
    .optional()
    .default(KanjiReadingSortField.CREATED_AT),
  sort: z.nativeEnum(SortOrder).optional().default(SortOrder.DESC),
  search: z.string().optional(),
  kanjiId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  readingType: z.string().optional()
})

// Get Kanji Readings by Kanji ID params schema
export const GetKanjiReadingsByKanjiIdParamsSchema = z.object({
  kanjiId: z.string().transform((val) => parseInt(val, 10))
})

// Get Kanji Readings by Type params schema
export const GetKanjiReadingsByTypeParamsSchema = z.object({
  readingType: z.string()
})

// List Response Schema (internal use)
export const KanjiReadingListResponseSchema = z.object({
  data: z.array(KanjiReadingSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number()
})

// Standard Response Schemas (like vocabulary pattern)
export const KanjiReadingResSchema = z
  .object({
    statusCode: z.number(),
    data: KanjiReadingSchema,
    message: z.string()
  })
  .strict()

export const KanjiReadingListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(KanjiReadingSchema),
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
export type KanjiReading = z.infer<typeof KanjiReadingSchema>
export type CreateKanjiReadingBodyType = z.infer<typeof CreateKanjiReadingSchema>
export type UpdateKanjiReadingBodyType = z.infer<typeof UpdateKanjiReadingSchema>
export type GetKanjiReadingByIdParamsType = z.infer<
  typeof GetKanjiReadingByIdParamsSchema
>
export type GetKanjiReadingListQueryType = z.infer<typeof GetKanjiReadingListQuerySchema>
export type GetKanjiReadingsByKanjiIdParamsType = z.infer<
  typeof GetKanjiReadingsByKanjiIdParamsSchema
>
export type GetKanjiReadingsByTypeParamsType = z.infer<
  typeof GetKanjiReadingsByTypeParamsSchema
>
export type KanjiReadingResType = z.infer<typeof KanjiReadingResSchema>
export type KanjiReadingListResType = z.infer<typeof KanjiReadingListResSchema>
