import { checkIdSchema } from '@/common/utils/id.validation'
import { LanguagesMessage } from '@/i18n/message-keys'
import { paginatedResSchema } from '@/shared/utils/pagination'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  isValidLanguageCode,
  isValidLanguageName,
  LanguagesSchema
} from '../entities/languages.entity'

export const CreateLanguagesSchema = z.object({
  id: z.number().optional(),
  code: z
    .string()
    .min(2, LanguagesMessage.CODE_TOO_SHORT)
    .max(10, LanguagesMessage.CODE_TOO_LONG)
    .refine(isValidLanguageCode, {
      message: LanguagesMessage.CODE_INVALID
    }),
  name: z
    .string()
    .min(1, LanguagesMessage.NAME_REQUIRED)
    .max(100, LanguagesMessage.NAME_TOO_LONG)
    .refine(isValidLanguageName, {
      message: LanguagesMessage.NAME_INVALID
    }),
  flag: z.string().optional()
})

export type CreateLanguagesBody = z.infer<typeof CreateLanguagesSchema>

// Zod DTOs
export class CreateLanguagesBodyDTO extends createZodDto(CreateLanguagesSchema) {}

export const UpdateLanguagesSchema = z.object({
  code: z
    .string()
    .min(2, LanguagesMessage.CODE_TOO_SHORT)
    .max(10, LanguagesMessage.CODE_TOO_LONG)
    .refine(isValidLanguageCode, {
      message: LanguagesMessage.CODE_INVALID
    })
    .optional(),
  name: z
    .string()
    .min(1, LanguagesMessage.NAME_REQUIRED)
    .max(100, LanguagesMessage.NAME_TOO_LONG)
    .refine(isValidLanguageName, {
      message: LanguagesMessage.NAME_INVALID
    })
    .optional()
})

export type UpdateLanguagesBody = z.infer<typeof UpdateLanguagesSchema>

export class UpdateLanguagesBodyDTO extends createZodDto(UpdateLanguagesSchema) {}

export const GetLanguagesByIdParamsSchema = z.object({
  id: checkIdSchema(LanguagesMessage.INVALID_ID)
})

export type GetLanguagesByIdParams = z.infer<typeof GetLanguagesByIdParamsSchema>

export class GetLanguagesByIdParamsDTO extends createZodDto(
  GetLanguagesByIdParamsSchema
) {}

export const GetLanguagesListQuerySchema = z.object({
  currentPage: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('1'),
  pageSize: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('10'),
  search: z.string().optional(),
  code: z.string().optional()
})

export type GetLanguagesListQuery = z.infer<typeof GetLanguagesListQuerySchema>

export class GetLanguagesListQueryDTO extends createZodDto(GetLanguagesListQuerySchema) {}

export const GetLanguagesByCodeParamsSchema = z.object({
  code: z.string().min(2, LanguagesMessage.CODE_REQUIRED)
})

export type GetLanguagesByCodeParams = z.infer<typeof GetLanguagesByCodeParamsSchema>

export class GetLanguagesByCodeParamsDTO extends createZodDto(
  GetLanguagesByCodeParamsSchema
) {}

// Standard Response Schemas (like vocabulary pattern)

export const LanguagesResSchema = resSchema(LanguagesSchema).strict()

export type LanguagesRes = z.infer<typeof LanguagesResSchema>

export class LanguagesResDTO extends createZodDto(LanguagesResSchema) {}

export const LanguagesListResSchema = paginatedResSchema(LanguagesSchema)

export type LanguagesListRes = z.infer<typeof LanguagesListResSchema>

export class LanguagesListResDTO extends createZodDto(LanguagesListResSchema) {}

// GET /languages/check/:code has no success message today: message is optional
export const LanguageSupportResSchema = resSchema(
  z.object({ supported: z.boolean() })
).partial({
  message: true
})

export type LanguageSupportRes = z.infer<typeof LanguageSupportResSchema>

export class LanguageSupportResDTO extends createZodDto(LanguageSupportResSchema) {}
