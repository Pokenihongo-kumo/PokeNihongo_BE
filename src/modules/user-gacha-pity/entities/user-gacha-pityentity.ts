import { GachaPityType } from '@/common/constants/gacha.constant'
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

export const GetUserGachaPityDetailSchema = UserGachaPitySchema.nullable()

// Type exports
export type UserGachaPity = z.infer<typeof UserGachaPitySchema>
// Field for query
export type UserGachaPityFieldType = keyof z.infer<typeof UserGachaPitySchema>
export const USER_GACHA_PITY_FIELDS = Object.keys(
  UserGachaPitySchema.shape
) as UserGachaPityFieldType[]
