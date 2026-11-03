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
        return { statusCode, data }
      })
    )
  }
}
