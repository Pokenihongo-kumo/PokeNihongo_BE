import { resSchema } from '@/shared/utils/res-schema'
import { PermissionSchema } from '@/shared/models/shared-permission.model'
import { RoleSchema } from '@/shared/models/shared-role.model'
import { z } from 'zod'

export const RoleWithPermissionsSchema = RoleSchema.extend({
  permissions: z.array(PermissionSchema)
})

export const GetRoleParamsSchema = z
  .object({
    roleId: z.coerce.number()
  })
  .strict()

export const GetRoleDetailResSchema = resSchema(
  z.object({
    // role: RoleSchema,
    // return the full list of permissions available in the system
    permissions: z.array(PermissionSchema.extend({ hasPermission: z.boolean() }))
  })
)

export const CreateRoleBodySchema = RoleSchema.pick({
  name: true,
  description: true,
  isActive: true
}).strict()

export const CreateRoleResSchema = z.object({
  data: RoleSchema,
  message: z.string()
})

export const UpdateRoleBodySchema = RoleSchema.pick({
  name: true,
  description: true,
  isActive: true
})
  .extend({
    permissionIds: z.array(z.number())
  })
  .strict()

export const UpdateRoleResSchema = CreateRoleResSchema

export type RoleWithPermissions = z.infer<typeof RoleWithPermissionsSchema>
export type CreateRoleBody = z.infer<typeof CreateRoleBodySchema>
export type UpdateRoleBody = z.infer<typeof UpdateRoleBodySchema>

// field cho qs
type RoleFieldType = keyof z.infer<typeof RoleSchema>
export const ROLE_FIELDS = Object.keys(RoleSchema.shape) as RoleFieldType[]
