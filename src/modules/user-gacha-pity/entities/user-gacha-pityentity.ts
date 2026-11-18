import { GachaPityType } from '@/common/constants/gacha.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base UserGachaPity Schema
export const UserGachaPitySchema = z.object({
  id: z.number(),
  userId: z.number(),
  pityCount: z.number().min(0).default(0),
  status: z
    .enum([
      GachaPityType.PENDING,
      GachaPityType.COMPLETED_MAX,
      GachaPityType.COMPLETED_LUCK
    ])
    .default(GachaPityType.PENDING),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateUserGachaPityBodySchema = UserGachaPitySchema.pick({
  userId: true,
  pityCount: true,
  status: true
})
  .extend({
    userId: z.number().optional()
  })
  .strict()

export const CreateUserGachaPityResSchema = resSchema(UserGachaPitySchema)

// Update Schema
export const UpdateUserGachaPityBodySchema =
  CreateUserGachaPityBodySchema.partial().strict()

export const UpdateUserGachaPityResSchema = CreateUserGachaPityResSchema

export const UpdateWithListItemResSchema = resSchema(z.array(UserGachaPitySchema))

// Query Schema
export const GetUserGachaPityParamsSchema = z.object({
  userGachaPityId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetUserGachaPityDetailSchema = UserGachaPitySchema.nullable()

export const GetUserGachaPityDetailResSchema = resSchema(GetUserGachaPityDetailSchema)

// Type exports
export type UserGachaPityType = z.infer<typeof UserGachaPitySchema>
export type CreateUserGachaPityBodyType = z.infer<typeof CreateUserGachaPityBodySchema>
export type UpdateUserGachaPityBodyType = z.infer<typeof UpdateUserGachaPityBodySchema>
export type GetUserGachaPityParamsType = z.infer<typeof GetUserGachaPityParamsSchema>

// Field for query
export type UserGachaPityFieldType = keyof z.infer<typeof UserGachaPitySchema>
export const USER_GACHA_PITY_FIELDS = Object.keys(
  UserGachaPitySchema.shape
) as UserGachaPityFieldType[]
