import { checkIdSchema } from '@/common/utils/id.validation'
import { WordTypeMessage } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  isValidTranslationKey,
  TRANSLATION_KEY_ERROR,
  WordTypeSchema,
  WordTypeViewSchema
} from '../entities/wordtype.entity'

// Create WordType schema (cần nameKey, ID tùy chọn)

export const CreateWordTypeSchema = z.object({
  id: z.number().optional(),
  nameKey: z
    .string()
    .min(1, 'Name key không được để trống')
    .max(100, 'Name key quá dài (tối đa 100 ký tự)')
    .refine(isValidTranslationKey, {
      message: TRANSLATION_KEY_ERROR
    })
})

export type CreateWordTypeBody = z.infer<typeof CreateWordTypeSchema>

// Zod DTOs
export class CreateWordTypeBodyDTO extends createZodDto(CreateWordTypeSchema) {}

// Update WordType schema

export const UpdateWordTypeSchema = z.object({
  nameKey: z
    .string()
    .min(1, 'Name key không được để trống')
    .max(100, 'Name key quá dài (tối đa 100 ký tự)')
    .refine(isValidTranslationKey, {
      message: TRANSLATION_KEY_ERROR
    })
    .optional()
})

export type UpdateWordTypeBody = z.infer<typeof UpdateWordTypeSchema>

export class UpdateWordTypeBodyDTO extends createZodDto(UpdateWordTypeSchema) {}

// Get WordType by ID params schema

export const GetWordTypeByIdParamsSchema = z.object({
  id: checkIdSchema(WordTypeMessage.INVALID_ID)
})

export type GetWordTypeByIdParams = z.infer<typeof GetWordTypeByIdParamsSchema>

export class GetWordTypeByIdParamsDTO extends createZodDto(GetWordTypeByIdParamsSchema) {}

// Get WordType list query schema

export const GetWordTypeListQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),
  sortBy: z.enum(['id', 'nameKey', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
})

export type GetWordTypeListQuery = z.infer<typeof GetWordTypeListQuerySchema>

export class GetWordTypeListQueryDTO extends createZodDto(GetWordTypeListQuerySchema) {}

// Get WordType by nameKey params schema

export const GetWordTypeByNameKeyParamsSchema = z.object({
  nameKey: z.string().min(1, 'Name key không được để trống')
})

export type GetWordTypeByNameKeyParams = z.infer<typeof GetWordTypeByNameKeyParamsSchema>

export class GetWordTypeByNameKeyParamsDTO extends createZodDto(
  GetWordTypeByNameKeyParamsSchema
) {}

export const WordTypeListResSchema = paginatedResSchema(WordTypeViewSchema)

export type WordTypeListRes = z.infer<typeof WordTypeListResSchema>

export class WordTypeListResDTO extends createZodDto(WordTypeListResSchema) {}

// Detail/create/update response envelope

export const WordTypeResSchema = resSchema(WordTypeSchema)

export type WordTypeRes = z.infer<typeof WordTypeResSchema>

export class WordTypeResDTO extends createZodDto(WordTypeResSchema) {}

export const WordTypeStatsResSchema = resSchema(z.object({ total: z.number() }))

export type WordTypeStatsRes = z.infer<typeof WordTypeStatsResSchema>

export class WordTypeStatsResDTO extends createZodDto(WordTypeStatsResSchema) {}
