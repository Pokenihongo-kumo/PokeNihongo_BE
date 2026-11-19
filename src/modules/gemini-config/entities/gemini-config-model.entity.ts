import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

const MAX_TOKENS_JSON_MODE = 3072
const MAX_TOKENS_DEFAULT = 2000
const MIN_TOKENS = 1024

export const GeminiConfigModelBase = z.object({
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
