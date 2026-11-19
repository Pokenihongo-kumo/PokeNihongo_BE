import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common'
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

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        const ctx = context.switchToHttp()
        const response = ctx.getResponse()
        // statusCode in the body always mirrors the HTTP status; a value set by
        // the service is ignored (response contract: no 2xx with another code)
        const statusCode = response.statusCode
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
