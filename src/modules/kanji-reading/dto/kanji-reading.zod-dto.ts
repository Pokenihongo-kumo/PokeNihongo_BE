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

export type GetKanjiReadingByIdParams = z.infer<typeof GetKanjiReadingByIdParamsSchema>

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

export type GetKanjiReadingsByKanjiIdParams = z.infer<
  typeof GetKanjiReadingsByKanjiIdParamsSchema
>

export class GetKanjiReadingsByKanjiIdParamsDTO extends createZodDto(
  GetKanjiReadingsByKanjiIdParamsSchema
) {}

export const GetKanjiReadingsByTypeParamsSchema = z.object({
  readingType: z.string()
})

export type GetKanjiReadingsByTypeParams = z.infer<
  typeof GetKanjiReadingsByTypeParamsSchema
>

export class GetKanjiReadingsByTypeParamsDTO extends createZodDto(
  GetKanjiReadingsByTypeParamsSchema
) {}

// statusCode is part of the envelope, else the serializer drops it

export const KanjiReadingResSchema = resSchema(KanjiReadingResItemSchema)

export type KanjiReadingRes = z.infer<typeof KanjiReadingResSchema>

export class KanjiReadingResDTO extends createZodDto(KanjiReadingResSchema) {}

export const KanjiReadingListResSchema = paginatedResSchema(KanjiReadingResItemSchema)

export type KanjiReadingListRes = z.infer<typeof KanjiReadingListResSchema>

export class KanjiReadingListResDTO extends createZodDto(KanjiReadingListResSchema) {}

export const KanjiReadingArrayResSchema = resSchema(z.array(KanjiReadingResItemSchema))

export type KanjiReadingArrayRes = z.infer<typeof KanjiReadingArrayResSchema>

export class KanjiReadingArrayResDTO extends createZodDto(KanjiReadingArrayResSchema) {}

const ReadingTypeCountSchema = z.object({ readingType: z.string(), count: z.number() })

export const KanjiReadingStatsResSchema = resSchema(
  z.object({ total: z.number(), byReadingType: z.array(ReadingTypeCountSchema) })
)

export type KanjiReadingStatsRes = z.infer<typeof KanjiReadingStatsResSchema>

export class KanjiReadingStatsResDTO extends createZodDto(KanjiReadingStatsResSchema) {}

export const KanjiReadingTypeStatsResSchema = resSchema(z.array(ReadingTypeCountSchema))

export type KanjiReadingTypeStatsRes = z.infer<typeof KanjiReadingTypeStatsResSchema>

export class KanjiReadingTypeStatsResDTO extends createZodDto(
  KanjiReadingTypeStatsResSchema
) {}
