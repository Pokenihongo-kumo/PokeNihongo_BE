import { KanjiReadingSortField, SortOrder } from '@/common/enum/enum'
import { checkIdSchema } from '@/common/utils/id.validation'
import { KanjiReadingMessage } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  KanjiReadingResItemSchema,
  reading,
  readingType
} from '../entities/kanji-reading.entity'

export const CreateKanjiReadingSchema = z.object({
  kanjiId: z.number().min(1, KanjiReadingMessage.KANJI_ID_INVALID),
  readingType,
  reading
})

export type CreateKanjiReadingBody = z.infer<typeof CreateKanjiReadingSchema>

export class CreateKanjiReadingBodyDTO extends createZodDto(CreateKanjiReadingSchema) {}

export const UpdateKanjiReadingSchema = z.object({
  readingType: readingType.optional(),
  reading: reading.optional()
})

export type UpdateKanjiReadingBody = z.infer<typeof UpdateKanjiReadingSchema>

export class UpdateKanjiReadingBodyDTO extends createZodDto(UpdateKanjiReadingSchema) {}

export const GetKanjiReadingByIdParamsSchema = z.object({
  id: checkIdSchema(KanjiReadingMessage.INVALID_ID)
})

export class GetKanjiReadingByIdParamsDTO extends createZodDto(
  GetKanjiReadingByIdParamsSchema
) {}

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

export type GetKanjiReadingListQuery = z.infer<typeof GetKanjiReadingListQuerySchema>

export class GetKanjiReadingListQueryDTO extends createZodDto(
  GetKanjiReadingListQuerySchema
) {}

export const GetKanjiReadingsByKanjiIdParamsSchema = z.object({
  kanjiId: checkIdSchema(KanjiReadingMessage.KANJI_ID_INVALID)
})

export class GetKanjiReadingsByKanjiIdParamsDTO extends createZodDto(
  GetKanjiReadingsByKanjiIdParamsSchema
) {}

export const GetKanjiReadingsByTypeParamsSchema = z.object({
  readingType: z.string()
})

export class GetKanjiReadingsByTypeParamsDTO extends createZodDto(
  GetKanjiReadingsByTypeParamsSchema
) {}

// statusCode is part of the envelope, else the serializer drops it

export const KanjiReadingResSchema = resSchema(KanjiReadingResItemSchema)

export class KanjiReadingResDTO extends createZodDto(KanjiReadingResSchema) {}

export const KanjiReadingListResSchema = paginatedResSchema(KanjiReadingResItemSchema)

export class KanjiReadingListResDTO extends createZodDto(KanjiReadingListResSchema) {}
