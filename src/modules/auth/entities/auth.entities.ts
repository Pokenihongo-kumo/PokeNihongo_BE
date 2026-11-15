import { TypeOfVerificationCode } from '@/common/constants/auth.constant'
import { AuthMessage } from '@/i18n/message-keys'
import { LevelSchema } from '@/modules/level/entities/level.entity'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { RoleSchema } from 'src/shared/models/shared-role.model'
import { UserSchema } from 'src/shared/models/shared-user.model'
import { z } from 'zod'
extendZodWithOpenApi(z)

// Emails are stored lowercase: every auth input is trimmed and lowercased the
// same way (login already did; forgot-password, OTP and check-email did not)
const emailSchema = z.string().trim().toLowerCase().email()
patchNestJsSwagger()

export const DeviceSchema = z.object({
  id: z.number(),
  userId: z.number(),
  userAgent: z.string(),
  ip: z.string(),
  lastActive: z.date(),
  createdAt: z.date(),
  isActive: z.boolean()
})

export const VerificationCodeSchema = z.object({
  id: z.number(),
  email: emailSchema,
  code: z.string().length(6),
  type: z.enum([
    TypeOfVerificationCode.REGISTER,
    TypeOfVerificationCode.FORGOT_PASSWORD,
    TypeOfVerificationCode.LOGIN
  ]),
  expiresAt: z.date(),
  createdAt: z.date()
})

export const SendOTPBodySchema = VerificationCodeSchema.pick({
  email: true,
  type: true
}).strict()

// GET /auth/check-email/:email (any string used to be taken as a new email)
export const CheckEmailParamsSchema = z
  .object({ email: z.string().trim().toLowerCase().email(AuthMessage.INVALID_EMAIL) })
  .strict()

export const VerifyOTPBodySchema = VerificationCodeSchema.pick({
  email: true,
  code: true,
  type: true
}).strict()

export const VerifyOTPResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      message: z.string()
    }),
    message: z.string()
  })
  .strict()

export const LoginBodySchema = z
  .object({ email: emailSchema, password: UserSchema.shape.password })
  .strict()

export const LoginResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      ...UserSchema.pick({
        id: true,
        name: true,
        email: true,
        status: true,
        levelJLPT: true,
        eloscore: true,
        phoneNumber: true,
        exp: true,
        roleId: true,
        avatar: true
      }).shape,
      role: RoleSchema,

      level: LevelSchema.optional().nullable()
    }),

    message: z.string()
  })
  .strict()

export const RegisterBodySchema = UserSchema.pick({
  name: true,
  email: true,
  password: true
})
  .extend({
    email: emailSchema,
    confirmPassword: z.string().min(6).max(100),
    // from POST /auth/verify-otp (type REGISTER) for this email; one use
    registrationToken: z.string().min(1).max(200)
  })
  .strict()
// .superRefine(({ confirmPassword, password }, ctx) => {
//   if (confirmPassword !== password) {
//     ctx.addIssue({
//       code: 'custom',
//       message: 'Password and confirm password must match',
//       path: ['confirmPassword']
//     })
//   }
// })

export const RegisterResSchema = LoginResSchema

export const RefreshTokenBodySchema = z
  .object({
    refreshToken: z.string()
  })
  .strict()

export const RefreshTokenResSchema = LoginResSchema

export const RefreshTokenSchema = z.object({
  token: z.string(),
  userId: z.number(),
  deviceId: z.number(),
  expiresAt: z.date(),
  createdAt: z.date()
})

export const LogoutBodySchema = RefreshTokenBodySchema

export const GoogleAuthStateSchema = DeviceSchema.pick({
  userAgent: true,
  ip: true
})

export const GetAuthorizationUrlResSchema = z.object({
  statusCode: z.number(),
  data: z.object({
    url: z.string().url()
  }),
  message: z.string()
})

// GET /auth/google-link (ADR D-auth §3): the PKCE challenge of the client that
// starts sign-in (S256 of its code verifier, base64url) and where to send it back
export const GoogleLinkQuerySchema = z
  .object({
    codeChallenge: z
      .string()
      .regex(/^[A-Za-z0-9_-]{43,128}$/, 'codeChallenge must be a base64url S256 value'),
    redirectUri: z.string().url().optional()
  })
  .strict()

// POST /auth/google/exchange: the one-time code from the callback redirect and
// the code verifier only the client that started sign-in knows
export const GoogleExchangeBodySchema = z
  .object({
    code: z.string().min(1).max(200),
    codeVerifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/)
  })
  .strict()

export const GoogleExchangeResSchema = z.object({
  statusCode: z.number(),
  data: z.object({ accessToken: z.string(), refreshToken: z.string() }),
  message: z.string()
})

export const ForgotPasswordBodySchema = z
  .object({
    email: emailSchema
  })
  .strict()

export const verifyForgotPasswordBodySchema = z
  .object({
    email: emailSchema,
    code: z.string().length(6)
  })
  .strict()

export const verifyForgotPasswordResSchema = z
  .object({
    data: z.object({
      accessToken: z.string()
    }),
    message: z.string(),
    statusCode: z.number()
  })
  .strict()

export const ResetPasswordBodySchema = z
  .object({
    // code: z.string().length(6),
    email: emailSchema,
    newPassword: z.string().min(6).max(100),
    confirmNewPassword: z.string().min(6).max(100)
  })
  .strict()
  .superRefine(({ confirmNewPassword, newPassword }, ctx) => {
    if (confirmNewPassword !== newPassword) {
      ctx.addIssue({
        code: 'custom',
        message: AuthMessage.PASSWORD_MUST_BE_MATCH,
        path: ['confirmNewPassword']
      })
    }
  })

export const ChangePasswordBodySchema = z
  .object({
    password: z.string().min(6).max(100),
    newPassword: z.string().min(6).max(100),
    confirmNewPassword: z.string().min(6).max(100)
  })
  .strict()
  .superRefine(({ confirmNewPassword, newPassword }, ctx) => {
    if (confirmNewPassword !== newPassword) {
      ctx.addIssue({
        code: 'custom',
        message: AuthMessage.PASSWORD_MUST_BE_MATCH,
        path: ['confirmNewPassword']
      })
    }
  })

export const UpdateLevelJLPTBodySchema = z
  .object({
    levelJLPT: z.number().min(3).max(5)
  })
  .strict()

export const UpdateLevelJLPTResSchema = z
  .object({
    data: UserSchema.omit({ password: true }),
    message: z.string(),
    statusCode: z.number()
  })
  .strict()

export const UpdateMeBodySchema = z
  .object({
    name: z.string().trim().min(2).max(256).optional(),
    phoneNumber: z.string().min(9).max(15).optional(),
    avatar: z.string().url().optional() // Thêm avatar như URL optional
  })
  .strict()

export const UpdateFcmTokenDeviceBodySchema = z
  .object({
    fcmToken: z.string().nullable()
  })
  .strict()

export const AccountResSchema = z.object({
  data: UserSchema.omit({ password: true }),
  message: z.string()
})

export const VerifyEmailBodySchema = UserSchema.pick({
  email: true
}).strict()

export const GetAccountProfileResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      ...UserSchema.omit({ password: true }).shape,
      role: RoleSchema.pick({ id: true, name: true, description: true }),

      level: z
        .object({
          ...LevelSchema.shape,
          nextLevel: LevelSchema.omit({ nextLevelId: true, rewardId: true }).nullable()
        })
        .nullable(),
      pokemonCount: z.number(),
      rankName: z.string(),
      subscription: z.object({
        canRead: z.boolean(),
        canListen: z.boolean(),
        isUltra: z.boolean(),
        ultraExpiresAt: z.date().nullable()
      })
    }),
    message: z.string()
  })
  .strict()

//type
export type VerifyEmailBodyType = z.infer<typeof VerifyEmailBodySchema>
export type RegisterBodyType = z.infer<typeof RegisterBodySchema>
export type RegisterResType = z.infer<typeof RegisterResSchema>
export type VerificationCodeType = z.infer<typeof VerificationCodeSchema>
export type SendOTPBodyType = z.infer<typeof SendOTPBodySchema>
export type LoginBodyType = z.infer<typeof LoginBodySchema>
export type LoginResType = z.infer<typeof LoginResSchema>
export type RefreshTokenType = z.infer<typeof RefreshTokenSchema>
export type RefreshTokenBodyType = z.infer<typeof RefreshTokenBodySchema>
export type RefreshTokenResType = LoginResType
export type DeviceType = z.infer<typeof DeviceSchema>
export type LogoutBodyType = RefreshTokenBodyType
export type GoogleAuthStateType = z.infer<typeof GoogleAuthStateSchema>
export type GetAuthorizationUrlResType = z.infer<typeof GetAuthorizationUrlResSchema>
export type GoogleLinkQueryType = z.infer<typeof GoogleLinkQuerySchema>
export type GoogleExchangeBodyType = z.infer<typeof GoogleExchangeBodySchema>
export type ForgotPasswordBodyType = z.infer<typeof ForgotPasswordBodySchema>
export type verifyForgotPasswordBodyType = z.infer<typeof verifyForgotPasswordBodySchema>
export type verifyForgotPasswordResType = z.infer<typeof verifyForgotPasswordResSchema>
export type ResetPasswordBodyType = z.infer<typeof ResetPasswordBodySchema>
export type ChangePasswordBodyType = z.infer<typeof ChangePasswordBodySchema>
export type UpdateMeBodyType = z.infer<typeof UpdateMeBodySchema>
export type AccountResType = z.infer<typeof AccountResSchema>
export type GetAccountProfileResType = z.infer<typeof GetAccountProfileResSchema>

export type VerifyOTPBodyType = z.infer<typeof VerifyOTPBodySchema>
