import { SetMetadata } from '@nestjs/common'

export const RATE_LIMIT_KEY = 'rateLimit'

export interface RateLimitOptions {
  windowMs: number // thời gian window (ms)
  max: number // số lượng request tối đa trong window
  keyGenerator?: (req: any) => string // function để tạo key unique cho rate limit
}

// One rule, or several checked together (for example per email and per IP)
export const RateLimit = (options: RateLimitOptions | RateLimitOptions[]) =>
  SetMetadata(RATE_LIMIT_KEY, Array.isArray(options) ? options : [options])
