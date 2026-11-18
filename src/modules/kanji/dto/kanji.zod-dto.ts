import { KanjiSortField, SortOrder } from '@/common/enum/enum'
import { checkIdSchema } from '@/common/utils/id.validation'
import { KanjiMessage } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import { KanjiManagementSchema, KanjiSchema } from '../entities/kanji.entity'

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

export type CreateKanjiBody = z.infer<typeof CreateKanjiSchema>

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

export type UpdateKanjiBody = z.infer<typeof UpdateKanjiSchema>

// Get Kanji by ID params schema

export const GetKanjiByIdParamsSchema = z.object({
  id: checkIdSchema(KanjiMessage.INVALID_ID)
})

export type GetKanjiByIdParams = z.infer<typeof GetKanjiByIdParamsSchema>

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

export type GetKanjiListQuery = z.infer<typeof GetKanjiListQuerySchema>

// List Response Schema (internal use)

export const KanjiListResponseSchema = z.object({
  data: z.array(KanjiSchema),
  total: z.number(),
  currentPage: z.number(),
  pageSize: z.number(),
  totalPages: z.number()
})

// Standard Response Schemas (like vocabulary pattern)

export const KanjiResSchema = resSchema(KanjiSchema).strict()

export type KanjiRes = z.infer<typeof KanjiResSchema>

export const KanjiListResSchema = paginatedResSchema(KanjiSchema).strict()

export type KanjiListRes = z.infer<typeof KanjiListResSchema>

export const KanjiManagementListResSchema =
  paginatedResSchema(KanjiManagementSchema).strict()

export type KanjiManagementListRes = z.infer<typeof KanjiManagementListResSchema>
