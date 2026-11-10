import { KanjiReadingSortField, SortOrder } from '@/common/enum/enum'
import { checkIdSchema } from '@/common/utils/id.validation'
import { KanjiReadingMessage } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Onyomi/Kunyomi: Hiragana, Katakana and basic punctuation only
const isOnyomiKunyomi = (text: string): boolean =>
  /^[\u3040-\u309F\u30A0-\u30FF\s\-.,!?'"]+$/.test(text)

const READING_TYPES = ['onyomi', 'kunyomi', 'nanori', 'irregular']
const isValidReadingType = (readingType: string): boolean =>
  READING_TYPES.includes(readingType.toLowerCase())

const readingType = z
  .string()
  .min(1, KanjiReadingMessage.READING_TYPE_REQUIRED)
  .max(20, KanjiReadingMessage.READING_TYPE_TOO_LONG)
  .refine(isValidReadingType, { message: KanjiReadingMessage.READING_TYPE_INVALID })
const reading = z
  .string()
  .min(1, KanjiReadingMessage.READING_REQUIRED)
  .max(100, KanjiReadingMessage.READING_TOO_LONG)
  .refine(isOnyomiKunyomi, { message: KanjiReadingMessage.READING_NOT_KANA })

// Also validates the readings in kanji's update body
export const KanjiReadingSchema = z.object({
  id: z.number(),
  kanjiId: z.number(),
  readingType,
  reading,
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateKanjiReadingSchema = z.object({
  kanjiId: z.number().min(1, KanjiReadingMessage.KANJI_ID_INVALID),
  readingType,
  reading
})

export const UpdateKanjiReadingSchema = z.object({
  readingType: readingType.optional(),
  reading: reading.optional()
})

export const GetKanjiReadingByIdParamsSchema = z.object({
  id: checkIdSchema(KanjiReadingMessage.INVALID_ID)
})

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

export const GetKanjiReadingsByKanjiIdParamsSchema = z.object({
  kanjiId: checkIdSchema(KanjiReadingMessage.KANJI_ID_INVALID)
})

export const GetKanjiReadingsByTypeParamsSchema = z.object({
  readingType: z.string()
})

// Responses: stored rows, no input rules (a stored reading the rules reject
// must not turn the answer into a 500)
const KanjiReadingResItemSchema = z.object({
  id: z.number(),
  kanjiId: z.number(),
  readingType: z.string(),
  reading: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// statusCode is part of the envelope, else the serializer drops it
export const KanjiReadingResSchema = z.object({
  statusCode: z.number(),
  data: KanjiReadingResItemSchema,
  message: z.string()
})

export const KanjiReadingListResSchema = paginatedResSchema(KanjiReadingResItemSchema)

export type KanjiReading = z.infer<typeof KanjiReadingResItemSchema>
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
