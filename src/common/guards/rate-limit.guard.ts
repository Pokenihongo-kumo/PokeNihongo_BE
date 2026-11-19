import {
  RATE_LIMIT_KEY,
  RateLimitOptions
} from '@/common/decorators/rate-limit.decorator'
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import Redis from 'ioredis'

// Counts one hit and starts the window on the first one, in one atomic step:
// requests at the same moment cannot all read a count under the limit, and a
// counter always has an expiry (a key left without one is given it again), so
// no one is locked out for good. Fixed window from the first hit.
const HIT = `local count = redis.call('INCR', KEYS[1])
if count == 1 or redis.call('PTTL', KEYS[1]) < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return count`

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rules = this.reflector.get<RateLimitOptions[] | undefined>(
      RATE_LIMIT_KEY,
      context.getHandler()
    )
    if (!rules?.length) {
      return true // Nếu không có rate limit config thì cho phép
    }

    const request = context.switchToHttp().getRequest()
    for (const { windowMs, max, keyGenerator } of rules) {
      const key = keyGenerator ? keyGenerator(request) : this.defaultKey(request)
      const count = Number(await this.redisClient.eval(HIT, 1, key, String(windowMs)))
      if (count > max) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${Math.ceil(windowMs / 1000)} giây.`,
            error: 'Too Many Requests'
          },
          HttpStatus.TOO_MANY_REQUESTS
        )
      }
    }
    return true
  }

  private defaultKey(request: any) {
    const ip = request.ip || request.connection?.remoteAddress
    const route = request.route?.path || request.url
    return `rate_limit:${ip}:${request.method}:${route}`
  }
}
