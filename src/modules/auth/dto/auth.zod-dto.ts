import { AuthMessage } from '@/i18n/message-keys'
import { LevelSchema } from '@/modules/level/entities/level.entity'
import { RoleSchema } from '@/shared/models/shared-role.model'
import { UserSchema } from '@/shared/models/shared-user.model'
import { resSchema } from '@/shared/utils/res-schema'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { VerificationCodeSchema, emailSchema } from '../entities/auth.entity'

// GET /auth/check-email/:email (any string used to be taken as a new email)

export const CheckEmailParamsSchema = z
  .object({ email: z.string().trim().toLowerCase().email(AuthMessage.INVALID_EMAIL) })
  .strict()

export type CheckEmailParams = z.infer<typeof CheckEmailParamsSchema>

export class CheckEmailParamsDTO extends createZodDto(CheckEmailParamsSchema) {}

export const VerifyOTPBodySchema = VerificationCodeSchema.pick({
  email: true,
  code: true,
  type: true
}).strict()

export type VerifyOTPBody = z.infer<typeof VerifyOTPBodySchema>

export class VerifyOTPBodyDTO extends createZodDto(VerifyOTPBodySchema) {}

export const LoginBodySchema = z
  .object({ email: emailSchema, password: UserSchema.shape.password })
  .strict()

export type LoginBody = z.infer<typeof LoginBodySchema>

export class LoginBodyDTO extends createZodDto(LoginBodySchema) {}

export const LoginResSchema = resSchema(
  z.object({
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
  })
).strict()

export type LoginRes = z.infer<typeof LoginResSchema>

export class LoginResDTO extends createZodDto(LoginResSchema) {}

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

export type RegisterBody = z.infer<typeof RegisterBodySchema>

export class RegisterBodyDTO extends createZodDto(RegisterBodySchema) {}

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

export type RegisterRes = z.infer<typeof RegisterResSchema>

export class RegisterResDTO extends createZodDto(RegisterResSchema) {}

export const RefreshTokenBodySchema = z
  .object({
    refreshToken: z.string()
  })
  .strict()

export type RefreshTokenBody = z.infer<typeof RefreshTokenBodySchema>

export class RefreshTokenBodyDTO extends createZodDto(RefreshTokenBodySchema) {}

export const RefreshTokenResSchema = LoginResSchema

export type RefreshTokenRes = z.infer<typeof RefreshTokenResSchema>

export class RefreshTokenResDTO extends createZodDto(RefreshTokenResSchema) {}

export const LogoutBodySchema = RefreshTokenBodySchema

export type LogoutBody = z.infer<typeof LogoutBodySchema>

export class LogoutBodyDTO extends createZodDto(LogoutBodySchema) {}

export const GetAuthorizationUrlResSchema = resSchema(
  z.object({
    url: z.string().url()
  })
)

export type GetAuthorizationUrlRes = z.infer<typeof GetAuthorizationUrlResSchema>

export class GetAuthorizationUrlResDTO extends createZodDto(
  GetAuthorizationUrlResSchema
) {}

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

export type GoogleLinkQuery = z.infer<typeof GoogleLinkQuerySchema>

export class GoogleLinkQueryDTO extends createZodDto(GoogleLinkQuerySchema) {}

// POST /auth/google/exchange: the one-time code from the callback redirect and
// the code verifier only the client that started sign-in knows

export const GoogleExchangeBodySchema = z
  .object({
    code: z.string().min(1).max(200),
    codeVerifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/)
  })
  .strict()

export type GoogleExchangeBody = z.infer<typeof GoogleExchangeBodySchema>

export class GoogleExchangeBodyDTO extends createZodDto(GoogleExchangeBodySchema) {}

export const GoogleExchangeResSchema = resSchema(
  z.object({ accessToken: z.string(), refreshToken: z.string() })
)

export type GoogleExchangeRes = z.infer<typeof GoogleExchangeResSchema>

export class GoogleExchangeResDTO extends createZodDto(GoogleExchangeResSchema) {}

export const ForgotPasswordBodySchema = z
  .object({
    email: emailSchema
  })
  .strict()

export type ForgotPasswordBody = z.infer<typeof ForgotPasswordBodySchema>

export class ForgotPasswordBodyDTO extends createZodDto(ForgotPasswordBodySchema) {}

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

export type ResetPasswordBody = z.infer<typeof ResetPasswordBodySchema>

export class ResetPasswordBodyDTO extends createZodDto(ResetPasswordBodySchema) {}

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

export type ChangePasswordBody = z.infer<typeof ChangePasswordBodySchema>

export class ChangePasswordBodyDTO extends createZodDto(ChangePasswordBodySchema) {}

export const UpdateLevelJLPTBodySchema = z
  .object({
    levelJLPT: z.number().min(3).max(5)
  })
  .strict()

export type UpdateLevelJLPTBody = z.infer<typeof UpdateLevelJLPTBodySchema>

export class UpdateLevelJLPTBodyDTO extends createZodDto(UpdateLevelJLPTBodySchema) {}

export const UpdateLevelJLPTResSchema = resSchema(
  UserSchema.omit({ password: true })
).strict()

export type UpdateLevelJLPTRes = z.infer<typeof UpdateLevelJLPTResSchema>

export class UpdateLevelJLPTResDTO extends createZodDto(UpdateLevelJLPTResSchema) {}

export const UpdateMeBodySchema = z
  .object({
    name: z.string().trim().min(2).max(256).optional(),
    phoneNumber: z.string().min(9).max(15).optional(),
    avatar: z.string().url().optional() // Thêm avatar như URL optional
  })
  .strict()

export type UpdateMeBody = z.infer<typeof UpdateMeBodySchema>

export class UpdateMeBodyDTO extends createZodDto(UpdateMeBodySchema) {}

export const UpdateFcmTokenDeviceBodySchema = z
  .object({
    fcmToken: z.string().nullable()
  })
  .strict()

export type UpdateFcmTokenDeviceBody = z.infer<typeof UpdateFcmTokenDeviceBodySchema>

export class UpdateFcmTokenDeviceBodyDTO extends createZodDto(
  UpdateFcmTokenDeviceBodySchema
) {}

export const AccountResSchema = z.object({
  data: UserSchema.omit({ password: true }),
  message: z.string()
})

export type AccountRes = z.infer<typeof AccountResSchema>

export class AccountResDTO extends createZodDto(AccountResSchema) {}

export const GetAccountProfileResSchema = resSchema(
  z.object({
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
  })
).strict()

export type GetAccountProfileRes = z.infer<typeof GetAccountProfileResSchema>

export class GetAccountProfileResDTO extends createZodDto(GetAccountProfileResSchema) {}

// Check email: what the app does next (REGISTER, or LOGIN with or without OTP)
export const CheckEmailResSchema = resSchema(
  z.object({ type: z.string(), requiresOtp: z.boolean() })
)

export type CheckEmailRes = z.infer<typeof CheckEmailResSchema>

export class CheckEmailResDTO extends createZodDto(CheckEmailResSchema) {}
