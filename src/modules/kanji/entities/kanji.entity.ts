import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { KanjiMessage } from '@/i18n/message-keys'
import { checkIdSchema } from '@/common/utils/id.validation'
import { KanjiSortField, SortOrder } from '@/common/enum/enum'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Kanji Reading Schema
export const KanjiReadingSchema = z.object({
  id: z.number(),
  kanjiId: z.number(),
  readingType: z.string(),
  reading: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Kanji Management Schema for UI
export const KanjiManagementSchema = z.object({
  id: z.number(),
  kanji: z.string(),
  meaning: z.string(),
  strokeCount: z.number().nullable().optional(),
  jlptLevel: z.number().nullable().optional(),
  onyomi: z.string(),
  kunyomi: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const KanjiSchema = z.object({
  id: z.number(),
  character: z
    .string()
    .min(1, 'Ký tự Kanji không được để trống')
    .max(10, 'Ký tự Kanji quá dài (tối đa 10 ký tự)'),
  meaningKey: z
    .string()
    .min(1, 'Key nghĩa không được để trống')
    .max(200, 'Key nghĩa quá dài (tối đa 200 ký tự)'),
  strokeCount: z
    .number()
    .min(1, 'Số nét vẽ phải lớn hơn 0')
    .max(50, 'Số nét vẽ quá lớn (tối đa 50 nét)')
    .nullable()
    .optional(),
  jlptLevel: z
    .number()
    .min(1, 'Cấp độ JLPT phải từ 1-5')
    .max(5, 'Cấp độ JLPT phải từ 1-5')
    .nullable()
    .optional(),
  img: z
    .string()
    .max(500, 'URL hình ảnh quá dài (tối đa 500 ký tự)')
    .nullable()
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  readings: z.array(KanjiReadingSchema).optional(),
  meanings: z
    .array(
      z.object({
        meaningKey: z.string(),
        translations: z.record(z.string(), z.string())
      })
    )
    .optional()
})

export const CreateKanjiSchema = z.object({
  character: z
    .string()
    .min(1, 'Ký tự Kanji không được để trống')
    .max(10, 'Ký tự Kanji quá dài (tối đa 10 ký tự)'),
  meaningKey: z
    .string()
    .min(1, 'Key nghĩa không được để trống')
    .max(200, 'Key nghĩa quá dài (tối đa 200 ký tự)'),
  strokeCount: z
    .number()
    .min(1, 'Số nét vẽ phải lớn hơn 0')
    .max(50, 'Số nét vẽ quá lớn (tối đa 50 nét)')
    .optional(),
  jlptLevel: z
    .number()
    .min(1, 'Cấp độ JLPT phải từ 1-5')
    .max(5, 'Cấp độ JLPT phải từ 1-5')
    .optional(),
  img: z.string().max(500, 'URL hình ảnh quá dài (tối đa 500 ký tự)').optional()
})

export const UpdateKanjiSchema = z.object({
  character: z
    .string()
    .min(1, 'Ký tự Kanji không được để trống')
    .max(10, 'Ký tự Kanji quá dài (tối đa 10 ký tự)')
    .optional(),
  meaningKey: z
    .string()
    .min(1, 'Key nghĩa không được để trống')
    .max(200, 'Key nghĩa quá dài (tối đa 200 ký tự)')
    .optional(),
  strokeCount: z
    .number()
    .min(1, 'Số nét vẽ phải lớn hơn 0')
    .max(50, 'Số nét vẽ quá lớn (tối đa 50 nét)')
    .optional(),
  jlptLevel: z
    .number()
    .min(1, 'Cấp độ JLPT phải từ 1-5')
    .max(5, 'Cấp độ JLPT phải từ 1-5')
    .optional(),
  img: z.string().max(500, 'URL hình ảnh quá dài (tối đa 500 ký tự)').optional()
})

// Get Kanji by ID params schema
export const GetKanjiByIdParamsSchema = z.object({
  id: checkIdSchema(KanjiMessage.INVALID_ID)
})

// Get Kanji list query schema (standardize on currentPage/pageSize + sortOrder)
export const GetKanjiListQuerySchema = z.object({
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
  sortBy: z.nativeEnum(KanjiSortField).optional(),
  sortOrder: z.nativeEnum(SortOrder).optional(),
  search: z.string().optional(),
  jlptLevel: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  strokeCount: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  lessonId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional()
})

// List Response Schema (internal use)
export const KanjiListResponseSchema = z.object({
  data: z.array(KanjiSchema),
  total: z.number(),
  currentPage: z.number(),
  pageSize: z.number(),
  totalPages: z.number()
})

// Standard Response Schemas (like vocabulary pattern)
export const KanjiResSchema = z
  .object({
    statusCode: z.number(),
    data: KanjiSchema,
    message: z.string()
  })
  .strict()

export const KanjiListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(KanjiSchema),
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

export const KanjiManagementListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(KanjiManagementSchema),
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
export type Kanji = z.infer<typeof KanjiSchema>
export type CreateKanjiBodyType = z.infer<typeof CreateKanjiSchema>
export type UpdateKanjiBodyType = z.infer<typeof UpdateKanjiSchema>
export type GetKanjiByIdParamsType = z.infer<typeof GetKanjiByIdParamsSchema>
export type GetKanjiListQueryType = z.infer<typeof GetKanjiListQuerySchema>
export type KanjiResType = z.infer<typeof KanjiResSchema>
export type KanjiListResType = z.infer<typeof KanjiListResSchema>
export type KanjiManagement = z.infer<typeof KanjiManagementSchema>
export type KanjiManagementListResType = z.infer<typeof KanjiManagementListResSchema>
