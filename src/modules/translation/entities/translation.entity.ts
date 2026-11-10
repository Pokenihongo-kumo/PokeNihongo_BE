import { SortOrder, TranslationSortField } from '@/common/enum/enum'
import { checkIdSchema } from '@/common/utils/id.validation'
import { TranslationMessage } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Segments start with a letter (module.field); see TRANSLATION_KEY_FORMAT
const isValidTranslationKey = (key: string): boolean =>
  /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)*$/.test(key)

const languageId = z.number().min(1, TranslationMessage.LANGUAGE_ID_INVALID)
const key = z
  .string()
  .min(1, TranslationMessage.KEY_REQUIRED)
  .max(500, TranslationMessage.KEY_TOO_LONG)
  .refine(isValidTranslationKey, { message: TranslationMessage.KEY_FORMAT })
const value = z
  .string()
  .min(1, TranslationMessage.VALUE_REQUIRED)
  .max(2000, TranslationMessage.VALUE_TOO_LONG)

export const TranslationSchema = z.object({
  id: z.number(),
  languageId,
  key,
  value,
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateTranslationSchema = z.object({ languageId, key, value })

// POST /translation/bulk: the body is an array, validated item by item
export const CreateTranslationsSchema = z.array(CreateTranslationSchema)

export const UpdateTranslationSchema = z.object({
  languageId: languageId.optional(),
  key: key.optional(),
  value: value.optional()
})

export const GetTranslationByIdParamsSchema = z.object({
  id: checkIdSchema(TranslationMessage.INVALID_ID)
})

export const DeleteTranslationsByKeyParamsSchema = z.object({
  key: z.string().min(1, TranslationMessage.KEY_REQUIRED)
})

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

export const GetTranslationsByKeyQuerySchema = z.object({
  key: z.string().min(1, TranslationMessage.KEY_REQUIRED)
})

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

export type TranslationType = z.infer<typeof TranslationSchema>
export type CreateTranslationBodyType = z.infer<typeof CreateTranslationSchema>
export type UpdateTranslationBodyType = z.infer<typeof UpdateTranslationSchema>
export type GetTranslationByIdParamsType = z.infer<typeof GetTranslationByIdParamsSchema>
export type GetTranslationListQueryType = z.infer<typeof GetTranslationListQuerySchema>
export type GetTranslationsByKeyQueryType = z.infer<
  typeof GetTranslationsByKeyQuerySchema
>
export type GetTranslationsByLanguageQueryType = z.infer<
  typeof GetTranslationsByLanguageQuerySchema
>
