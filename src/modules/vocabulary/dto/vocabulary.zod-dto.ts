import { VocabularySortField, VocabularySortOrder } from '@/common/enum/enum'
import { checkIdSchema } from '@/common/utils/id.validation'
import { VocabularyMessage } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  VocabularyDetailSchema,
  VocabularySchema,
  VocabularySearchHistoryItemSchema,
  VocabularySearchItemSchema,
  VocabularyStatisticsSchema
} from '../entities/vocabulary.entity'

export const CreateVocabularyBodySchema = VocabularySchema.pick({
  wordJp: true,
  reading: true,
  imageUrl: true,
  audioUrl: true
}).strict()

export class CreateVocabularyBodyDTO extends createZodDto(CreateVocabularyBodySchema) {}

export const UpdateVocabularyBodySchema = VocabularySchema.pick({
  wordJp: true,
  reading: true,
  imageUrl: true,
  audioUrl: true
})
  .partial()
  .strict()

export type UpdateVocabularyBody = z.infer<typeof UpdateVocabularyBodySchema>

export class UpdateVocabularyBodyDTO extends createZodDto(UpdateVocabularyBodySchema) {}

export const VocabularyResSchema = resSchema(VocabularySchema).strict()

export class VocabularyResDTO extends createZodDto(VocabularyResSchema) {}

export const VocabularyListResSchema = paginatedResSchema(VocabularySchema).strict()

export class VocabularyListResDTO extends createZodDto(VocabularyListResSchema) {}

export const GetVocabularyByIdParamsSchema = z
  .object({
    id: checkIdSchema(VocabularyMessage.INVALID_ID)
  })
  .strict()

export class GetVocabularyByIdParamsDTO extends createZodDto(
  GetVocabularyByIdParamsSchema
) {}

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

export type GetVocabularyListQuery = z.infer<typeof GetVocabularyListQuerySchema>

export class GetVocabularyListQueryDTO extends createZodDto(
  GetVocabularyListQuerySchema
) {}

export const VocabularyStatisticsResSchema = resSchema(
  VocabularyStatisticsSchema
).strict()

export class VocabularyStatisticsResDTO extends createZodDto(
  VocabularyStatisticsResSchema
) {}

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

export class VocabularySearchQueryDTO extends createZodDto(VocabularySearchQuerySchema) {}

export const VocabularySearchResSchema = paginatedResSchema(
  VocabularySearchItemSchema
).strict()

export class VocabularySearchResDTO extends createZodDto(VocabularySearchResSchema) {}

export const VocabularyDetailResSchema = resSchema(VocabularyDetailSchema).strict()

export class VocabularyDetailResDTO extends createZodDto(VocabularyDetailResSchema) {}

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

export class VocabularySearchHistoryQueryDTO extends createZodDto(
  VocabularySearchHistoryQuerySchema
) {}

export const VocabularySearchHistoryResSchema = paginatedResSchema(
  VocabularySearchHistoryItemSchema
).strict()

export class VocabularySearchHistoryResDTO extends createZodDto(
  VocabularySearchHistoryResSchema
) {}
