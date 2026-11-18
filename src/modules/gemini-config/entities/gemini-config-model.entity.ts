import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

const MAX_TOKENS_JSON_MODE = 3072
const MAX_TOKENS_DEFAULT = 2000
const MIN_TOKENS = 1024

const GeminiConfigModelBase = z.object({
  id: z.number(),
  name: z.string().min(1).max(255),
  geminiModelId: z.number(),
  presetId: z.number().optional().nullable(),
  maxTokens: z
    .number()
    .int()
    .min(MIN_TOKENS, { message: `maxTokens must be ≥ ${MIN_TOKENS}` })
    .max(MAX_TOKENS_JSON_MODE)
    .optional()
    .nullable(),
  jsonMode: z.boolean().optional().nullable(),
  systemInstruction: z.string().optional().nullable(),
  safetySettings: z.any().optional().nullable(),
  extraParams: z.any().optional().nullable(),
  isEnabled: z.boolean().default(true),
  createdById: z.number().nullable().optional(),
  updatedById: z.number().nullable().optional(),
  deletedById: z.number().nullable().optional(),
  deletedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})

export const GeminiConfigModelSchema = GeminiConfigModelBase

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

export const GetParamsGeminiConfigModelSchema = z.object({
  id: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GeminiConfigModelResSchema = resSchema(GeminiConfigModelSchema)

// types
export type CreateGeminiConfigModelBody = z.infer<
  typeof CreateGeminiConfigModelBodySchema
>
export type UpdateGeminiConfigModelBody = z.infer<
  typeof UpdateGeminiConfigModelBodySchema
>
export type GetParamsGeminiConfigModel = z.infer<typeof GetParamsGeminiConfigModelSchema>
export type GeminiConfigModelRes = z.infer<typeof GeminiConfigModelResSchema>
