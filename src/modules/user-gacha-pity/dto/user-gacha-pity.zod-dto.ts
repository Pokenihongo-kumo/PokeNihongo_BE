import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { resSchema } from '@/shared/utils/res-schema'
import { z } from 'zod'
import {
  GetUserGachaPityDetailSchema,
  UserGachaPitySchema
} from '../entities/user-gacha-pityentity'

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

export type CreateUserGachaPityBody = z.infer<typeof CreateUserGachaPityBodySchema>

export const CreateUserGachaPityResSchema = resSchema(UserGachaPitySchema)

// Update Schema

export const UpdateUserGachaPityBodySchema =
  CreateUserGachaPityBodySchema.partial().strict()

export type UpdateUserGachaPityBody = z.infer<typeof UpdateUserGachaPityBodySchema>

export const UpdateUserGachaPityResSchema = CreateUserGachaPityResSchema

export const UpdateWithListItemResSchema = resSchema(z.array(UserGachaPitySchema))

// Query Schema

export const GetUserGachaPityParamsSchema = z.object({
  userGachaPityId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export type GetUserGachaPityParams = z.infer<typeof GetUserGachaPityParamsSchema>

export const GetUserGachaPityDetailResSchema = resSchema(GetUserGachaPityDetailSchema)
