import { I18nService } from '@/i18n/i18n.service'
import { CommonMessage } from '@/i18n/message-keys'
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common'
import { Response } from 'express'

type FieldError = { field: string; message: string }

// Picks the first supported language (vi/en/ja) from Accept-Language; default vi.
function resolveLanguage(acceptLanguage?: string): string {
  if (!acceptLanguage) return 'vi'
  const languages = acceptLanguage
    .split(',')
    .map((l) => {
      const [locale, q] = l.trim().split(';q=')
      return { locale: locale.split('-')[0], quality: q ? parseFloat(q) : 1.0 }
    })
    .sort((a, b) => b.quality - a.quality)
  const supported = ['vi', 'en', 'ja']
  return languages.find((l) => supported.includes(l.locale))?.locale ?? 'vi'
}

// One error shape for every HTTP error (docs/standardization/response-contract.md):
// { statusCode, error, message: string, errors?: FieldError[], data? }
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name)

  constructor(private readonly i18nService: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest()
    const lang = resolveLanguage(request.headers['accept-language'])

    if (!(exception instanceof HttpException)) {
      // Unexpected error: log the details, never send them to the client
      this.logger.error(exception instanceof Error ? exception.stack : String(exception))
      const status = HttpStatus.INTERNAL_SERVER_ERROR
      response.status(status).json({
        statusCode: status,
        message: this.i18nService.translate(CommonMessage.ERROR, lang),
        error: HttpStatus[status]
      })
      return
    }

    const status = exception.getStatus()
    const exceptionResponse = exception.getResponse()
    let message = exception.message
    let errors: FieldError[] | undefined
    let dataToExpose: unknown

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as Record<string, any>
      if (responseObj.errorKey) {
        message = this.i18nService.translate(responseObj.errorKey, lang)
      } else if (typeof responseObj.message === 'string') {
        message = responseObj.message
      } else if (Array.isArray(responseObj.message)) {
        // e.g. new BadRequestException(['a', 'b']): keep message a string
        message = responseObj.message
          .map((m: unknown) => (typeof m === 'string' ? m : (m as any)?.message))
          .filter(Boolean)
          .join(', ')
      }
      if (Array.isArray(responseObj.errors)) {
        errors = responseObj.errors
      }
      if (responseObj.data) {
        // Only text details are appended; objects used to render "[object Object]"
        if (typeof responseObj.data === 'string') {
          message += `: ${responseObj.data}`
        }
        // Only attach data when caller provided `dataRes` in the exception response
        if (Object.prototype.hasOwnProperty.call(responseObj, 'dataRes')) {
          dataToExpose = responseObj.dataRes
        }
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
      ...(errors ? { errors } : {}),
      ...(dataToExpose !== undefined ? { data: dataToExpose } : {})
    })
  }
}
