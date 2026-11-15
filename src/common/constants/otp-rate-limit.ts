import { RateLimitOptions } from '@/common/decorators/rate-limit.decorator'

// The same email however it is typed
export const normalizeEmail = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()

const ipOf = (req: any): string => req.ip || req.socket?.remoteAddress || 'unknown'

// Every route that mails an OTP (check-email, forgot-password, /mail/send-otp)
// shares these counters, so changing route does not buy more mails
export const otpSendLimits = (emailOf: (req: any) => unknown): RateLimitOptions[] => [
  {
    windowMs: 60 * 1000,
    max: 3,
    keyGenerator: (req) => `otp_send:${normalizeEmail(emailOf(req))}`
  },
  { windowMs: 60 * 1000, max: 20, keyGenerator: (req) => `otp_send_ip:${ipOf(req)}` }
]

// Every route that checks an OTP (/auth/verify-otp, /mail/verify-otp) shares
// these counters. They are apart from the send counters: a new code does not
// give new guesses. A code lives 5 minutes, the window is as long
export const otpVerifyLimits = (emailOf: (req: any) => unknown): RateLimitOptions[] => [
  {
    windowMs: 5 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => `otp_verify:${normalizeEmail(emailOf(req))}`
  },
  {
    windowMs: 5 * 60 * 1000,
    max: 30,
    keyGenerator: (req) => `otp_verify_ip:${ipOf(req)}`
  }
]
