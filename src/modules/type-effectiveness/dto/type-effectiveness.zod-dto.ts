import { checkIdSchema } from '@/common/utils/id.validation'
import { TypeEffectivenessMessage } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { TypeEffectivenessSchema } from '../entities/type-effectiveness.entity'

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

export type CreateTypeEffectivenessBody = z.infer<
  typeof CreateTypeEffectivenessBodySchema
>

export class CreateTypeEffectivenessBodyDTO extends createZodDto(
  CreateTypeEffectivenessBodySchema
) {}

export const CreateTypeEffectivenessResSchema = resSchema(TypeEffectivenessSchema)

export class CreateTypeEffectivenessResDTO extends createZodDto(
  CreateTypeEffectivenessResSchema
) {}

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

export type UpdateTypeEffectivenessBody = z.infer<
  typeof UpdateTypeEffectivenessBodySchema
>

export class UpdateTypeEffectivenessBodyDTO extends createZodDto(
  UpdateTypeEffectivenessBodySchema
) {}

export const UpdateTypeEffectivenessResSchema = CreateTypeEffectivenessResSchema

export class UpdateTypeEffectivenessResDTO extends createZodDto(
  UpdateTypeEffectivenessResSchema
) {}

// Query Schema cho filtering

export const GetTypeEffectivenessParamsSchema = z.object({
  typeEffectivenessId: checkIdSchema(TypeEffectivenessMessage.INVALID_ID)
})

export class GetTypeEffectivenessParamsDTO extends createZodDto(
  GetTypeEffectivenessParamsSchema
) {}

// /weaknesses/:defenderId, /resistances/:defenderId

export const GetDefenderParamsSchema = z.object({
  defenderId: checkIdSchema(TypeEffectivenessMessage.INVALID_ID)
})

export class GetDefenderParamsDTO extends createZodDto(GetDefenderParamsSchema) {}

// POST /calculate-multi-type

export const CalculateMultiTypeBodySchema = z
  .object({
    defenderTypeIds: z.array(checkIdSchema(TypeEffectivenessMessage.INVALID_ID))
  })
  .strict()

export class CalculateMultiTypeBodyDTO extends createZodDto(
  CalculateMultiTypeBodySchema
) {}

// A row with its attacker and defender types (detail, weaknesses, resistances)
export const TypeEffectivenessWithTypesResItemSchema = z.object({
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
})

export const GetTypeEffectivenessDetailResSchema = resSchema(
  TypeEffectivenessWithTypesResItemSchema
)

export class GetTypeEffectivenessDetailResDTO extends createZodDto(
  GetTypeEffectivenessDetailResSchema
) {}

export const TypeEffectivenessArrayResSchema = resSchema(
  z.array(TypeEffectivenessWithTypesResItemSchema)
)

export class TypeEffectivenessArrayResDTO extends createZodDto(
  TypeEffectivenessArrayResSchema
) {}

// attacker type name -> defender type name -> multiplier
export const TypeEffectivenessMatrixResSchema = resSchema(
  z.record(z.string(), z.record(z.string(), z.number()))
)

export class TypeEffectivenessMatrixResDTO extends createZodDto(
  TypeEffectivenessMatrixResSchema
) {}

// attacker type name -> combined multiplier, split by outcome
const MultiplierByTypeSchema = z.record(z.string(), z.number())

export const MultiTypeEffectivenessResSchema = resSchema(
  z.object({
    weaknesses: MultiplierByTypeSchema,
    resistances: MultiplierByTypeSchema,
    immunities: MultiplierByTypeSchema
  })
)

export class MultiTypeEffectivenessResDTO extends createZodDto(
  MultiTypeEffectivenessResSchema
) {}
