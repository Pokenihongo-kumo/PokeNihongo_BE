import { TypeEffectivenessMessage } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base TypeEffectiveness Schema
export const TypeEffectivenessSchema = z.object({
  id: z.number(),
  attackerId: z.number(),
  defenderId: z.number(),
  multiplier: z
    .number()
    .min(0, TypeEffectivenessMessage.MULTIPLIER_MIN)
    .max(4, TypeEffectivenessMessage.MULTIPLIER_MAX)
    .refine((val) => [0, 0.25, 0.5, 1, 2, 4].includes(val), {
      message: TypeEffectivenessMessage.MULTIPLIER_INVALID
    }),

  // Audit fields
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),

  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable()
})

// Type exports
export type TypeEffectiveness = z.infer<typeof TypeEffectivenessSchema>
//Field for query
export type TypeEffectivenessFieldType = keyof z.infer<typeof TypeEffectivenessSchema>
export const TYPE_EFFECTIVENESS_FIELDS = Object.keys(
  TypeEffectivenessSchema.shape
) as TypeEffectivenessFieldType[]
