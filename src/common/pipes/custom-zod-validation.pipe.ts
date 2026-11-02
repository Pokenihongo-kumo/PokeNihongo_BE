import { I18nService } from '@/i18n/i18n.service'
import { ValidationMessage } from '@/i18n/message-keys'
import { UnprocessableEntityException } from '@nestjs/common'
import { createZodValidationPipe } from 'nestjs-zod'
import { ZodError, ZodIssue } from 'zod'

// Simple function to get language from request
function getLanguageFromRequest(): string {
  const request = (global as any).currentRequest
  let lang = 'vi'

  if (request?.headers?.['accept-language']) {
    const acceptLanguage = request.headers['accept-language']
    const languages = acceptLanguage
      .split(',')
      .map((l: string) => {
        const [locale, q] = l.trim().split(';q=')
        return {
          locale: locale.split('-')[0],
          quality: q ? parseFloat(q) : 1.0
        }
      })
      .sort((a: any, b: any) => b.quality - a.quality)

    const supportedLanguages = ['vi', 'en', 'ja']
    for (const language of languages) {
      if (supportedLanguages.includes(language.locale)) {
        lang = language.locale
        break
      }
    }
  }

  return lang
}

// Global variable to store I18nService instance
let globalI18nService: I18nService

export function setGlobalI18nService(service: I18nService) {
  globalI18nService = service
}

function fieldMessageKey(issue: ZodIssue): string {
  // Schemas may already use an i18n key as their message
  if (issue.message.includes('.')) return issue.message
  // A missing field is reported by Zod as invalid_type with received "undefined"
  if (issue.code === 'invalid_type' && issue.received === 'undefined') {
    return ValidationMessage.REQUIRED
  }
  if (issue.path.includes('userId') && issue.code === 'invalid_type') {
    return ValidationMessage.INVALID_USER_ID
  }
  if (issue.code === 'invalid_type') return ValidationMessage.INVALID_FORMAT
  if (issue.message.includes('Required')) return ValidationMessage.REQUIRED
  return ValidationMessage.INVALID_DATA
}

// 422 body: a translated summary in `message` (via errorKey in the exception
// filter) and one entry per invalid field in `errors`.
export function createValidationException(error: ZodError) {
  const lang = getLanguageFromRequest()
  const translate = (key: string) =>
    globalI18nService ? globalI18nService.translate(key, lang) : key

  return new UnprocessableEntityException({
    message: ValidationMessage.INVALID_DATA,
    errorKey: ValidationMessage.INVALID_DATA,
    errors: error.errors.map((issue) => ({
      field: issue.path.join('.'),
      message: translate(fieldMessageKey(issue))
    }))
  })
}

const CustomZodValidationPipe = createZodValidationPipe({ createValidationException })

export default CustomZodValidationPipe
