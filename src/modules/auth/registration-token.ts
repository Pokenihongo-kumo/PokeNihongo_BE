import { createHash, randomBytes } from 'crypto'

// ADR D-auth §2: a verified REGISTER OTP gives a one-time token that
// POST /auth/register requires. Redis keeps only its hash, with the email.
export const REGISTRATION_TOKEN_TTL_SECONDS = 15 * 60

export const newRegistrationToken = () => randomBytes(32).toString('base64url')

export const registrationTokenKey = (token: string) =>
  `reg:${createHash('sha256').update(token).digest('hex')}`

// Returns KEYS[1] and deletes it in one atomic step (a token works once)
export const TAKE = `local v = redis.call('get', KEYS[1])
if v then redis.call('del', KEYS[1]) end
return v`
