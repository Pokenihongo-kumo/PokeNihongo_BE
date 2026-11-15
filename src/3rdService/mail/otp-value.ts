// An OTP is kept in Redis under the email as "<code>.<sendId>". The send ID
// tells one send from another: two sends can draw the same 6-digit code, so
// the code alone cannot say which send a stored value belongs to.
export const toStoredOtp = (code: string, sendId: string) => `${code}.${sendId}`

// The code part; a value stored before send IDs existed is the code itself
export const codeOfStoredOtp = (stored: string | null): string | null =>
  stored === null ? null : stored.split('.')[0]

// Deletes KEYS[1] only while it still holds ARGV[1] (one atomic step), so a
// failed send cannot remove the code of a newer send
export const DELETE_IF_UNCHANGED = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`

// ADR D-auth §1: an OTP is kept per purpose, so a code sent to register cannot
// reset a password or confirm a new device
export type OtpPurpose = 'REGISTER' | 'FORGOT_PASSWORD' | 'LOGIN' | 'CHANGE_PASSWORD'
export const otpKey = (purpose: OtpPurpose, email: string) => `otp:${purpose}:${email}`

// Deletes KEYS[1] and returns 1 only when its code part equals ARGV[1], in one
// atomic step: of two checks with the right code only one succeeds
export const CONSUME_IF_CODE = `local v = redis.call('get', KEYS[1])
if v and (v == ARGV[1] or string.sub(v, 1, string.len(ARGV[1]) + 1) == ARGV[1] .. '.') then
  redis.call('del', KEYS[1])
  return 1
end
return 0`
