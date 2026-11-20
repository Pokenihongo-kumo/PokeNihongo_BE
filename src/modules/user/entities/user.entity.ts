import { LevelSchema } from '@/modules/level/entities/level.entity'
import { RoleSchema } from '@/shared/models/shared-role.model'
import { UserSchema } from '@/shared/models/shared-user.model'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const UserWithoutPasswordSchema = z.object({
  ...UserSchema.omit({ password: true }).shape, // Không trả về password
  role: RoleSchema.omit({
    createdById: true,
    updatedById: true,
    deletedById: true
  })
    .nullable()
    .optional(),
  level: LevelSchema.omit({
    createdById: true,
    updatedById: true,
    deletedById: true
  })
    .nullable()
    .optional()
})

export type User = z.infer<typeof UserSchema>
export type UserWithoutPassword = z.infer<typeof UserWithoutPasswordSchema>
type UserFieldType = keyof z.infer<typeof UserSchema>
export const USER_FIELDS = Object.keys(UserSchema.shape) as UserFieldType[]
