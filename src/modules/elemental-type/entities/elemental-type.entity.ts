import { checkIdSchema } from '@/common/utils/id.validation'
import { ElementalTypeMessage } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Schema cho display_name JSON
const DisplayNameSchema = z.object({
  en: z.string().min(1, ElementalTypeMessage.DISPLAY_NAME_REQUIRED),
  vi: z.string().min(1, ElementalTypeMessage.DISPLAY_NAME_REQUIRED),
  ja: z.string().min(1, ElementalTypeMessage.DISPLAY_NAME_REQUIRED)
})

export const ElementalTypeSchema = z.object({
  id: z.number(),
  type_name: z.string().min(1, ElementalTypeMessage.TYPE_NAME_REQUIRED),
  display_name: DisplayNameSchema,
  color_hex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, ElementalTypeMessage.INVALID_COLOR_HEX),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateElementalTypeBodySchema = ElementalTypeSchema.pick({
  type_name: true,
  display_name: true,
  color_hex: true
}).strict()

export const CreateElementalTypeResSchema = z.object({
  statusCode: z.number(),
  data: ElementalTypeSchema,
  message: z.string()
})

export const UpdateElementalTypeBodySchema = CreateElementalTypeBodySchema.partial()

export const UpdateElementalTypeResSchema = CreateElementalTypeResSchema

export const GetElementalTypeParamsSchema = z
  .object({
    elementId: checkIdSchema(ElementalTypeMessage.INVALID_DATA)
  })
  .strict()

export const GetElementalTypeDetailResSchema = z.object({
  statusCode: z.number(),
  data: ElementalTypeSchema,
  message: z.string()
})

// GET /elemental-type/active: every active type, not paginated
export const GetActiveElementalTypesResSchema = z.object({
  statusCode: z.number(),
  data: z.array(ElementalTypeSchema),
  message: z.string()
})

// Types
export type ElementalTypeType = z.infer<typeof ElementalTypeSchema>
export type CreateElementalTypeBodyType = z.infer<typeof CreateElementalTypeBodySchema>
export type UpdateElementalTypeBodyType = z.infer<typeof UpdateElementalTypeBodySchema>
export type GetElementalTypeParamsType = z.infer<typeof GetElementalTypeParamsSchema>
export type GetElementalTypeDetailResType = z.infer<
  typeof GetElementalTypeDetailResSchema
>
export type DisplayNameType = z.infer<typeof DisplayNameSchema>

// Fields for query parsing
type ElementalTypeFieldType = keyof z.infer<typeof ElementalTypeSchema>
export const ELEMENTAL_TYPE_FIELDS = [
  ...Object.keys(ElementalTypeSchema.shape),
  'display_name.en',
  'display_name.vi',
  'display_name.ja'
] as ElementalTypeFieldType[]
