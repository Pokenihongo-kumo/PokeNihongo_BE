import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { SortOrder, TranslationSortField } from '@/common/enum/enum'
import { checkIdSchema } from '@/common/utils/id.validation'
import { TranslationMessage } from '@/i18n/message-keys'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { key, languageId, value } from '../entities/translation.entity'

export const CreateTranslationSchema = z.object({ languageId, key, value })

export type CreateTranslationBody = z.infer<typeof CreateTranslationSchema>

// No response serializers: rows carry the other modules' *Key columns and a
// serializer schema would strip them from the answer
export class CreateTranslationBodyDTO extends createZodDto(CreateTranslationSchema) {}

// POST /translation/bulk: the body is an array, validated item by item

export const CreateTranslationsSchema = z.array(CreateTranslationSchema)

export class CreateTranslationsBodyDTO extends createZodDto(CreateTranslationsSchema) {}

export const UpdateTranslationSchema = z.object({
  languageId: languageId.optional(),
  key: key.optional(),
  value: value.optional()
})

export type UpdateTranslationBody = z.infer<typeof UpdateTranslationSchema>

export class UpdateTranslationBodyDTO extends createZodDto(UpdateTranslationSchema) {}

export const GetTranslationByIdParamsSchema = z.object({
  id: checkIdSchema(TranslationMessage.INVALID_ID)
})

export class GetTranslationByIdParamsDTO extends createZodDto(
  GetTranslationByIdParamsSchema
) {}

export const DeleteTranslationsByKeyParamsSchema = z.object({
  key: z.string().min(1, TranslationMessage.KEY_REQUIRED)
})

export class DeleteTranslationsByKeyParamsDTO extends createZodDto(
  DeleteTranslationsByKeyParamsSchema
) {}

export const GetTranslationListQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('1'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('10'),
  search: z.string().optional(),
  languageId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  key: z.string().optional(),
  sortBy: z
    .nativeEnum(TranslationSortField)
    .optional()
    .default(TranslationSortField.CREATED_AT),
  sort: z.nativeEnum(SortOrder).optional().default(SortOrder.DESC)
})

export type GetTranslationListQuery = z.infer<typeof GetTranslationListQuerySchema>

export class GetTranslationListQueryDTO extends createZodDto(
  GetTranslationListQuerySchema
) {}

export const GetTranslationsByKeyQuerySchema = z.object({
  key: z.string().min(1, TranslationMessage.KEY_REQUIRED)
})

export type GetTranslationsByKeyQuery = z.infer<typeof GetTranslationsByKeyQuerySchema>

export class GetTranslationsByKeyQueryDTO extends createZodDto(
  GetTranslationsByKeyQuerySchema
) {}

export const GetTranslationsByLanguageQuerySchema = z.object({
  languageId: checkIdSchema(TranslationMessage.LANGUAGE_ID_INVALID),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('1'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('10')
})

export type GetTranslationsByLanguageQuery = z.infer<
  typeof GetTranslationsByLanguageQuerySchema
>

export class GetTranslationsByLanguageQueryDTO extends createZodDto(
  GetTranslationsByLanguageQuerySchema
) {}

// ---- responses (output only: no input rules such as the key format)

// A translation row as stored: the reverse-relation key columns come back too
export const TranslationRowSchema = z.object({
  id: z.number(),
  languageId: z.number(),
  key: z.string(),
  value: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  rewardNameKey: z.string().nullable(),
  dailyRequestNameKey: z.string().nullable(),
  dailyRequestDescriptionKey: z.string().nullable(),
  shopBannerNameKey: z.string().nullable(),
  gachaBannerNameKey: z.string().nullable(),
  leaderboardSeasonNameKey: z.string().nullable(),
  debuffRoundNameKey: z.string().nullable(),
  achievementGroupNameKey: z.string().nullable(),
  achievementNameKey: z.string().nullable(),
  achievementDescriptionKey: z.string().nullable(),
  achievementConditionTextKey: z.string().nullable(),
  subscriptionNameKey: z.string().nullable(),
  subscriptionDescriptionKey: z.string().nullable(),
  featureNameKey: z.string().nullable()
})

export const TranslationResSchema = resSchema(TranslationRowSchema)

export class TranslationResDTO extends createZodDto(TranslationResSchema) {}

export const TranslationListResSchema = paginatedResSchema(TranslationRowSchema)

export class TranslationListResDTO extends createZodDto(TranslationListResSchema) {}

export const TranslationsByKeyResSchema = resSchema(
  z.object({ key: z.string(), translations: z.array(TranslationRowSchema) })
)

export class TranslationsByKeyResDTO extends createZodDto(TranslationsByKeyResSchema) {}

export const TranslationBulkResSchema = resSchema(z.object({ count: z.number() }))

export class TranslationBulkResDTO extends createZodDto(TranslationBulkResSchema) {}
