import { resSchema } from '@/shared/utils/res-schema'

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

export const UpdateGeminiConfigModelBodySchema =
  CreateGeminiConfigModelBodySchema.partial().strict()

export const GeminiConfigModelResSchema = resSchema(GeminiConfigModelSchema)
