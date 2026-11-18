import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const GeminiConfigSchema = z.object({
  id: z.number(),
  geminiConfigModelId: z.number(),
  prompt: z.string().min(1),
  isActive: z.boolean().default(true),

  createdById: z.number().nullable().optional(),
  updatedById: z.number().nullable().optional(),
  deletedById: z.number().nullable().optional(),
  deletedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
})

//type
export type GeminiConfig = z.infer<typeof GeminiConfigSchema>
//field
type GeminiConfigFieldType = keyof z.infer<typeof GeminiConfigSchema>
export const GEMINI_CONFIG_FIELDS = Object.keys(
  GeminiConfigSchema.shape
) as GeminiConfigFieldType[]
