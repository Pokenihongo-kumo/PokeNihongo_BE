import { checkIdSchema } from '@/common/utils/id.validation'
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

// Create Schema - chỉ cần attackerId, defenderId, multiplier
export const CreateTypeEffectivenessBodySchema = TypeEffectivenessSchema.pick({
  attackerId: true,
  defenderId: true,
  multiplier: true
})
  .strict()
  .refine((data) => data.attackerId !== data.defenderId, {
    message: TypeEffectivenessMessage.CONFLICT_ATTACK_DEFENSE_TYPE,
    path: ['attackerId']
  })

export const CreateTypeEffectivenessResSchema = z.object({
  statusCode: z.number(),
  data: TypeEffectivenessSchema,
  message: z.string()
})

// Update Schema - có thể update multiplier
export const UpdateTypeEffectivenessBodySchema = TypeEffectivenessSchema.pick({
  attackerId: true,
  defenderId: true,
  multiplier: true
})
  .partial()
  .strict()
  // Only when both are sent: a body with just `multiplier` used to fail here
  // (undefined === undefined)
  .refine(
    (data) =>
      data.attackerId === undefined ||
      data.defenderId === undefined ||
      data.attackerId !== data.defenderId,
    {
      message: TypeEffectivenessMessage.CONFLICT_ATTACK_DEFENSE_TYPE,
      path: ['attackerId']
    }
  )

export const UpdateTypeEffectivenessResSchema = CreateTypeEffectivenessResSchema

// Query Schema cho filtering
export const GetTypeEffectivenessParamsSchema = z.object({
  typeEffectivenessId: checkIdSchema(TypeEffectivenessMessage.INVALID_ID)
})

// /weaknesses/:defenderId, /resistances/:defenderId
export const GetDefenderParamsSchema = z.object({
  defenderId: checkIdSchema(TypeEffectivenessMessage.INVALID_ID)
})

// POST /calculate-multi-type
export const CalculateMultiTypeBodySchema = z
  .object({
    defenderTypeIds: z.array(checkIdSchema(TypeEffectivenessMessage.INVALID_ID))
  })
  .strict()

export const GetTypeEffectivenessDetailResSchema = z.object({
  statusCode: z.number(),
  data: z.object({
    ...TypeEffectivenessSchema.shape,
    attacker: z
      .object({
        id: z.number(),
        type_name: z.string(),
        display_name: z.unknown(),
        color_hex: z.string()
      })
      .optional()
      .nullable(),
    defender: z
      .object({
        id: z.number(),
        type_name: z.string(),
        display_name: z.unknown(),
        color_hex: z.string()
      })
      .optional()
      .nullable()
  }),
  message: z.string()
})

// Response Schema với thông tin attacker và defender
export const TypeEffectivenessResponseSchema = TypeEffectivenessSchema.extend({
  attacker: z
    .object({
      id: z.number(),
      type_name: z.string(),
      display_name: z.unknown(),
      color_hex: z.string()
    })
    .optional(),
  defender: z
    .object({
      id: z.number(),
      type_name: z.string(),
      display_name: z.unknown(),
      color_hex: z.string()
    })
    .optional()
})

// Type exports
export type TypeEffectivenessType = z.infer<typeof TypeEffectivenessSchema>
export type CreateTypeEffectivenessBodyType = z.infer<
  typeof CreateTypeEffectivenessBodySchema
>
export type UpdateTypeEffectivenessBodyType = z.infer<
  typeof UpdateTypeEffectivenessBodySchema
>
export type CalculateMultiTypeBodyType = z.infer<typeof CalculateMultiTypeBodySchema>
export type GetTypeEffectivenessParamsType = z.infer<
  typeof GetTypeEffectivenessParamsSchema
>
export type GetTypeEffectivenessDetailResType = z.infer<
  typeof GetTypeEffectivenessDetailResSchema
>
//Field for query
export type TypeEffectivenessFieldType = keyof z.infer<typeof TypeEffectivenessSchema>
export const TYPE_EFFECTIVENESS_FIELDS = Object.keys(
  TypeEffectivenessSchema.shape
) as TypeEffectivenessFieldType[]
