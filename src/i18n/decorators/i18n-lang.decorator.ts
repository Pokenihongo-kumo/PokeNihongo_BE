import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { resolveLanguage } from '../resolve-language'

// Language of the current HTTP request (Accept-Language, default vi)
export const I18nLang = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    resolveLanguage(ctx.switchToHttp().getRequest().headers['accept-language'])
)
