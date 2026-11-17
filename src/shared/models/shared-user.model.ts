import { UserStatus } from '@/common/constants/auth.constant'
import { AuthMessage } from '@/i18n/message-keys'
import { PermissionSchema } from 'src/shared/models/shared-permission.model'
import { RoleSchema } from 'src/shared/models/shared-role.model'
import { z } from 'zod'

export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string().min(1, AuthMessage.NAME_IS_REQUIRED).max(100),
  password: z.string().min(6).max(100),
  phoneNumber: z
    .string()
    .min(9, AuthMessage.PHONE_IS_INVALID)
    .max(15)
    .optional()
    .nullable(),
  avatar: z.string().nullable(),
  exp: z.number().min(0).optional().default(0),
  eloscore: z.number().min(0).optional().default(0),
  levelJLPT: z.number().min(3).max(5).nullable(),
  status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE]),
  levelId: z.number().min(1).optional().nullable(),
  roleId: z.number().positive(),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

/**
 * Áp dụng cho Response của api GET('profile') và GET('users/:userId')
 */
export const GetAccountProfileResSchema = UserSchema.omit({
  password: true
}).extend({
  role: RoleSchema.pick({
    id: true,
    name: true
  }).extend({
    permissions: z.array(
      PermissionSchema.pick({
        id: true,
        name: true,
        module: true,
        path: true,
        method: true
      })
    )
  })
})

/**
 * Áp dụng cho Response của api PUT('profile') và PUT('users/:userId')
 */
export const UpdateProfileResSchema = z.object({
  data: UserSchema.omit({
    password: true
  }),
  message: z.string()
})

export type UserType = z.infer<typeof UserSchema>

// A user found by id or by email
export type WhereUniqueUserType = { id: number } | { email: string }
export type GetUserProfileResType = z.infer<typeof GetAccountProfileResSchema>
export type UpdateProfileResType = z.infer<typeof UpdateProfileResSchema>
