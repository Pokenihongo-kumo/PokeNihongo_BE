import { PermissionSchema } from 'src/shared/models/shared-permission.model'
import { z } from 'zod'

export const GetPermissionParamsSchema = z
  .object({
    permissionId: z.coerce.number() // Phải thêm coerce để chuyển từ string sang number
  })
  .strict()

export const GetPermissionDetailResSchema = z.object({
  data: PermissionSchema,
  message: z.string()
})

export const CreatePermissionBodySchema = PermissionSchema.pick({
  name: true,
  path: true,
  method: true,
  module: true,
  description: true
})
  .partial({ description: true })
  .strict()

export const CreatePermissionResSchema = z.object({
  data: PermissionSchema,
  message: z.string()
})

export const UpdatePermissionBodySchema = CreatePermissionBodySchema

export const UpdatePermissionResSchema = CreatePermissionResSchema

export type Permission = z.infer<typeof PermissionSchema>
export type CreatePermissionBody = z.infer<typeof CreatePermissionBodySchema>
export type UpdatePermissionBody = z.infer<typeof UpdatePermissionBodySchema>

// field cho qs
type PermissionFieldType = keyof z.infer<typeof PermissionSchema>

export const PERMISSION_FIELDS = Object.keys(
  PermissionSchema.shape
) as PermissionFieldType[]
