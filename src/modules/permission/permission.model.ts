import { PermissionSchema } from 'src/shared/models/shared-permission.model'
import { z } from 'zod'

// export const GetPermissionsResSchema = z.object({
//   data: z.array(PermissionSchema),
//   totalItems: z.number(), // Tổng số item
//   page: z.number(), // Số trang hiện tại
//   limit: z.number(), // Số item trên 1 trang
//   totalPages: z.number() // Tổng số trang
// })

export const GetPermissionsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1), // Phải thêm coerce để chuyển từ string sang number
    limit: z.coerce.number().int().positive().default(10) // Phải thêm coerce để chuyển từ string sang number
  })
  .strict()

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
// export type GetPermissionsResType = z.infer<typeof GetPermissionsResSchema>
export type GetPermissionsQuery = z.infer<typeof GetPermissionsQuerySchema>
export type GetPermissionDetailRes = z.infer<typeof GetPermissionDetailResSchema>
export type CreatePermissionBody = z.infer<typeof CreatePermissionBodySchema>
export type CreatePermissionRes = z.infer<typeof CreatePermissionResSchema>
export type GetPermissionParams = z.infer<typeof GetPermissionParamsSchema>
export type UpdatePermissionBody = z.infer<typeof UpdatePermissionBodySchema>
export type UpdatePermissionRes = z.infer<typeof UpdatePermissionResSchema>

// field cho qs
type PermissionFieldType = keyof z.infer<typeof PermissionSchema>

export const PERMISSION_FIELDS = Object.keys(
  PermissionSchema.shape
) as PermissionFieldType[]
