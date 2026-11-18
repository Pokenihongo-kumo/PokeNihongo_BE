import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
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

export const CreateGeminiConfigBodySchema = GeminiConfigSchema.pick({
  geminiConfigModelId: true,
  prompt: true,
  isActive: true
}).strict()

export const CreateGeminiConfigResSchema = resSchema(GeminiConfigSchema)

export const UpdateGeminiConfigBodySchema =
  CreateGeminiConfigBodySchema.partial().strict()

export const UpdateGeminiConfigResSchema = CreateGeminiConfigResSchema

export const GetParamsGeminiConfigSchema = z.object({
  geminiConfigId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetGeminiConfigResSchema = resSchema(GeminiConfigSchema)

//type
export type GeminiConfigType = z.infer<typeof GeminiConfigSchema>
export type CreateGeminiConfigBodyType = z.infer<typeof CreateGeminiConfigBodySchema>
export type UpdateGeminiConfigBodyType = z.infer<typeof UpdateGeminiConfigBodySchema>
export type GetParamsGeminiConfigType = z.infer<typeof GetParamsGeminiConfigSchema>
export type GetGeminiConfigResType = z.infer<typeof GetGeminiConfigResSchema>

//field
type GeminiConfigFieldType = keyof z.infer<typeof GeminiConfigSchema>
export const GEMINI_CONFIG_FIELDS = Object.keys(
  GeminiConfigSchema.shape
) as GeminiConfigFieldType[]
