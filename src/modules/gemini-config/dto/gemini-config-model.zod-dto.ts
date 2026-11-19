import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GeminiConfigModelBase,
  GeminiConfigModelSchema
} from '../entities/gemini-config-model.entity'

export const CreateGeminiConfigModelBodySchema = GeminiConfigModelBase.pick({
  name: true,
  geminiModelId: true,
  presetId: true,
  maxTokens: true,
  jsonMode: true,
  systemInstruction: true,
  safetySettings: true,
  extraParams: true,
  isEnabled: true
})
  .partial({
    presetId: true,
    maxTokens: true,
    jsonMode: true,
    systemInstruction: true,
    safetySettings: true,
    extraParams: true,
    isEnabled: true
  })
  .strict()

// types

export type CreateGeminiConfigModelBody = z.infer<
  typeof CreateGeminiConfigModelBodySchema
>

export const UpdateGeminiConfigModelBodySchema =
  CreateGeminiConfigModelBodySchema.partial().strict()

export type UpdateGeminiConfigModelBody = z.infer<
  typeof UpdateGeminiConfigModelBodySchema
>

export const GetParamsGeminiConfigModelSchema = z.object({
  id: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export type GetParamsGeminiConfigModel = z.infer<typeof GetParamsGeminiConfigModelSchema>

export const GeminiConfigModelResSchema = resSchema(GeminiConfigModelSchema)

export type GeminiConfigModelRes = z.infer<typeof GeminiConfigModelResSchema>
