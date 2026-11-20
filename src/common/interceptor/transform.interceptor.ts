import { I18nService } from '@/i18n/i18n.service'
import { resolveLanguage } from '@/i18n/resolve-language'
import {
  MessageKey,
  RESPONSE_MESSAGE,
  TranslatableMessage
} from '@/i18n/response-message'
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface Response<T> {
  statusCode: number
  data: T
  message?: string
}

// { message } or { statusCode, message } and nothing else: a service result
// with no data (typically delete). Wrapping it as `data` used to nest the
// message, and routes with a MessageResDTO serializer then failed (500).
function isMessageOnly(value: object): value is { message: string } {
  const keys = Object.keys(value)
  return (
    typeof (value as { message?: unknown }).message === 'string' &&
    keys.every((key) => key === 'message' || key === 'statusCode')
  )
}

// The one place success messages are translated (P5d), in the request's
// Accept-Language: a handler marked @ResponseMessage(KEY) returns its data;
// a handler that picks its message returns { message: msg(KEY, args), data }.
// Runs inside ZodSerializerInterceptor, so the serializer sees a string.
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(
    private readonly reflector: Reflector,
    private readonly i18n: I18nService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const fixedKey = this.reflector.get<MessageKey | undefined>(
      RESPONSE_MESSAGE,
      context.getHandler()
    )
    return next.handle().pipe(
      map((result) => {
        const ctx = context.switchToHttp()
        const response = ctx.getResponse()
        // statusCode in the body always mirrors the HTTP status; a value set by
        // the service is ignored (response contract: no 2xx with another code)
        const statusCode = response.statusCode
        let data = result
        const lang = () => resolveLanguage(ctx.getRequest()?.headers?.['accept-language'])
        if (fixedKey) {
          data = { message: this.i18n.translate(fixedKey, lang()), data: result ?? null }
        } else if (
          data &&
          typeof data === 'object' &&
          (data as { message?: unknown }).message instanceof TranslatableMessage
        ) {
          const { key, args } = (data as { message: TranslatableMessage }).message
          data = { ...data, message: this.i18n.translate(key, lang(), args) }
        }
        if (data && typeof data === 'object' && 'data' in data && 'message' in data) {
          return { ...data, statusCode }
        }
        if (data && typeof data === 'object' && isMessageOnly(data)) {
          return { statusCode, message: data.message, data: null as T }
        }
        return { statusCode, data }
      })
    )
  }
}
