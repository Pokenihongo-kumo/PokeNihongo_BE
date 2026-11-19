import { resSchema } from '@/shared/utils/res-schema'
import { PermissionSchema } from 'src/shared/models/shared-permission.model'
import { RoleSchema } from 'src/shared/models/shared-role.model'
import { z } from 'zod'

export const RoleWithPermissionsSchema = RoleSchema.extend({
  permissions: z.array(PermissionSchema)
})

export const GetRolesResSchema = z.object({
  data: z.array(RoleSchema),
  totalItems: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number()
})

export const GetRolesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10)
  })
  .strict()

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
export type GetRolesRes = z.infer<typeof GetRolesResSchema>
export type GetRolesQuery = z.infer<typeof GetRolesQuerySchema>
export type GetRoleDetailRes = z.infer<typeof GetRoleDetailResSchema>
export type CreateRoleRes = z.infer<typeof CreateRoleResSchema>
export type CreateRoleBody = z.infer<typeof CreateRoleBodySchema>
export type GetRoleParams = z.infer<typeof GetRoleParamsSchema>
export type UpdateRoleBody = z.infer<typeof UpdateRoleBodySchema>
export type UpdateRoleRes = z.infer<typeof UpdateRoleResSchema>

// field cho qs
type RoleFieldType = keyof z.infer<typeof RoleSchema>
export const ROLE_FIELDS = Object.keys(RoleSchema.shape) as RoleFieldType[]
