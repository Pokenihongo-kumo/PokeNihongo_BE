import { checkIdSchema } from '@/common/utils/id.validation'
import { ElementalTypeMessage } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ElementalTypeSchema } from '../entities/elemental-type.entity'

export const CreateElementalTypeBodySchema = ElementalTypeSchema.pick({
  type_name: true,
  display_name: true,
  color_hex: true
}).strict()

export type CreateElementalTypeBody = z.infer<typeof CreateElementalTypeBodySchema>

export class CreateElementalTypeBodyDTO extends createZodDto(
  CreateElementalTypeBodySchema
) {}

export const CreateElementalTypeResSchema = resSchema(ElementalTypeSchema)

export type CreateElementalTypeRes = z.infer<typeof CreateElementalTypeResSchema>

export class CreateElementalTypeResDTO extends createZodDto(
  CreateElementalTypeResSchema
) {}

export const UpdateElementalTypeBodySchema = CreateElementalTypeBodySchema.partial()

export type UpdateElementalTypeBody = z.infer<typeof UpdateElementalTypeBodySchema>

export class UpdateElementalTypeBodyDTO extends createZodDto(
  UpdateElementalTypeBodySchema
) {}

export const UpdateElementalTypeResSchema = CreateElementalTypeResSchema

export type UpdateElementalTypeRes = z.infer<typeof UpdateElementalTypeResSchema>

export class UpdateElementalTypeResDTO extends createZodDto(
  UpdateElementalTypeResSchema
) {}

export const GetElementalTypeParamsSchema = z
  .object({
    elementId: checkIdSchema(ElementalTypeMessage.INVALID_DATA)
  })
  .strict()

export type GetElementalTypeParams = z.infer<typeof GetElementalTypeParamsSchema>

export class GetElementalTypeParamsDTO extends createZodDto(
  GetElementalTypeParamsSchema
) {}

export const GetElementalTypeDetailResSchema = resSchema(ElementalTypeSchema)

export type GetElementalTypeDetailRes = z.infer<typeof GetElementalTypeDetailResSchema>

export class GetElementalTypeDetailResDTO extends createZodDto(
  GetElementalTypeDetailResSchema
) {}

// GET /elemental-type/active: every active type, not paginated

export const GetActiveElementalTypesResSchema = resSchema(z.array(ElementalTypeSchema))

export type GetActiveElementalTypesRes = z.infer<typeof GetActiveElementalTypesResSchema>

export class GetActiveElementalTypesResDTO extends createZodDto(
  GetActiveElementalTypesResSchema
) {}
