import { MeaningSchema } from '@/modules/meaning/entities/meaning.entity'
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

export type CreateVocabularyBody = z.infer<typeof CreateVocabularyBodySchema>

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

export type VocabularyRes = z.infer<typeof VocabularyResSchema>

export class VocabularyResDTO extends createZodDto(VocabularyResSchema) {}

export const VocabularyListResSchema = paginatedResSchema(VocabularySchema).strict()

export type VocabularyListRes = z.infer<typeof VocabularyListResSchema>

export class VocabularyListResDTO extends createZodDto(VocabularyListResSchema) {}

export const GetVocabularyByIdParamsSchema = z
  .object({
    id: checkIdSchema(VocabularyMessage.INVALID_ID)
  })
  .strict()

export type GetVocabularyByIdParams = z.infer<typeof GetVocabularyByIdParamsSchema>

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

export type VocabularyStatisticsRes = z.infer<typeof VocabularyStatisticsResSchema>

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

export type VocabularySearchQuery = z.infer<typeof VocabularySearchQuerySchema>

export class VocabularySearchQueryDTO extends createZodDto(VocabularySearchQuerySchema) {}

export const VocabularySearchResSchema = paginatedResSchema(
  VocabularySearchItemSchema
).strict()

export type VocabularySearchRes = z.infer<typeof VocabularySearchResSchema>

export class VocabularySearchResDTO extends createZodDto(VocabularySearchResSchema) {}

export const VocabularyDetailResSchema = resSchema(VocabularyDetailSchema).strict()

export type VocabularyDetailRes = z.infer<typeof VocabularyDetailResSchema>

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

export type VocabularySearchHistoryQuery = z.infer<
  typeof VocabularySearchHistoryQuerySchema
>

export class VocabularySearchHistoryQueryDTO extends createZodDto(
  VocabularySearchHistoryQuerySchema
) {}

export const VocabularySearchHistoryResSchema = paginatedResSchema(
  VocabularySearchHistoryItemSchema
).strict()

export type VocabularySearchHistoryRes = z.infer<typeof VocabularySearchHistoryResSchema>

export class VocabularySearchHistoryResDTO extends createZodDto(
  VocabularySearchHistoryResSchema
) {}

// ---- responses (output only)

export const VocabularyMeaningAddedResSchema = resSchema(MeaningSchema)

export type VocabularyMeaningAddedRes = z.infer<typeof VocabularyMeaningAddedResSchema>

export class VocabularyMeaningAddedResDTO extends createZodDto(
  VocabularyMeaningAddedResSchema
) {}

// Create full: the word (an existing one may carry more fields: kept), the
// meaning with the translations and examples as sent
export const VocabularyCreateFullResSchema = resSchema(
  z.object({
    vocabulary: z
      .object({
        id: z.number(),
        wordJp: z.string(),
        reading: z.string(),
        imageUrl: z.string().nullable(),
        audioUrl: z.string().nullable(),
        levelN: z.number().nullable(),
        wordTypeId: z.number().nullable(),
        createdById: z.number().nullable(),
        createdAt: z.date(),
        updatedAt: z.date()
      })
      .passthrough(),
    meaning: z.object({
      id: z.number(),
      translations: z.array(z.object({ language_code: z.string(), value: z.string() })),
      examples: z.array(
        z.object({
          original_sentence: z.string(),
          translations: z.array(
            z.object({ language_code: z.string(), sentence: z.string() })
          )
        })
      )
    }),
    translationsCreated: z.number(),
    isNew: z.boolean()
  })
)

export type VocabularyCreateFullRes = z.infer<typeof VocabularyCreateFullResSchema>

export class VocabularyCreateFullResDTO extends createZodDto(
  VocabularyCreateFullResSchema
) {}
