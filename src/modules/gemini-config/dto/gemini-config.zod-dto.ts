import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { GeminiConfigSchema } from '../entities/gemini-config.entity'
import {
  CreateGeminiConfigModelBodySchema,
  GeminiConfigModelResSchema,
  GetParamsGeminiConfigModelSchema,
  UpdateGeminiConfigModelBodySchema
} from './gemini-config-model.zod-dto'

// GeminiConfigModel DTOs
export class CreateGeminiConfigModelBodyDTO extends createZodDto(
  CreateGeminiConfigModelBodySchema
) {}

export class UpdateGeminiConfigModelBodyDTO extends createZodDto(
  UpdateGeminiConfigModelBodySchema
) {}

export class GetParamsGeminiConfigModelDTO extends createZodDto(
  GetParamsGeminiConfigModelSchema
) {}

export class GeminiConfigModelResDTO extends createZodDto(GeminiConfigModelResSchema) {}

export const CreateGeminiConfigBodySchema = GeminiConfigSchema.pick({
  geminiConfigModelId: true,
  prompt: true,
  isActive: true
}).strict()

export type CreateGeminiConfigBody = z.infer<typeof CreateGeminiConfigBodySchema>

export class CreateGeminiConfigBodyDTO extends createZodDto(
  CreateGeminiConfigBodySchema
) {}

export const CreateGeminiConfigResSchema = resSchema(GeminiConfigSchema)

export class CreateGeminiConfigResDTO extends createZodDto(CreateGeminiConfigResSchema) {}

export const UpdateGeminiConfigBodySchema =
  CreateGeminiConfigBodySchema.partial().strict()

export type UpdateGeminiConfigBody = z.infer<typeof UpdateGeminiConfigBodySchema>

export class UpdateGeminiConfigBodyDTO extends createZodDto(
  UpdateGeminiConfigBodySchema
) {}

export const UpdateGeminiConfigResSchema = CreateGeminiConfigResSchema

export class UpdateGeminiConfigResDTO extends createZodDto(UpdateGeminiConfigResSchema) {}

export const GetParamsGeminiConfigSchema = z.object({
  geminiConfigId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export type GetParamsGeminiConfig = z.infer<typeof GetParamsGeminiConfigSchema>

export class GetParamsGeminiConfigDTO extends createZodDto(GetParamsGeminiConfigSchema) {}

export const GetGeminiConfigResSchema = resSchema(GeminiConfigSchema)

export type GetGeminiConfigRes = z.infer<typeof GetGeminiConfigResSchema>

export class GetGeminiConfigResDTO extends createZodDto(GetGeminiConfigResSchema) {}
