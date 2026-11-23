import { TypeOfVerificationCode } from '@/common/constants/auth.constant'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)

// Emails are stored lowercase: every auth input is trimmed and lowercased the
// same way (login already did; forgot-password, OTP and check-email did not)
export const emailSchema = z.string().trim().toLowerCase().email()
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

export const RefreshTokenSchema = z.object({
  token: z.string(),
  userId: z.number(),
  deviceId: z.number(),
  expiresAt: z.date(),
  createdAt: z.date()
})
export type RefreshToken = z.infer<typeof RefreshTokenSchema>
export type Device = z.infer<typeof DeviceSchema>
