import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const UserAgent = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest()
    // Device rows require a user agent; clients without the header (scripts,
    // some HTTP libraries) used to crash login with a 500
    return request.headers['user-agent'] || 'unknown'
  }
)
