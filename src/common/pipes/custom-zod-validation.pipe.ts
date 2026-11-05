import { ValidationMessage } from '@/i18n/message-keys'
import { UnprocessableEntityException } from '@nestjs/common'
import { createZodValidationPipe } from 'nestjs-zod'
import { ZodError, ZodIssue } from 'zod'

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

// 422 body: a summary key (errorKey) and one i18n key per invalid field.
// ApiExceptionFilter translates both with the language of the request being
// answered, so nothing here depends on which request is "current".
export function createValidationException(error: ZodError) {
  return new UnprocessableEntityException({
    message: ValidationMessage.INVALID_DATA,
    errorKey: ValidationMessage.INVALID_DATA,
    errors: error.errors.map((issue) => ({
      field: issue.path.join('.'),
      messageKey: fieldMessageKey(issue)
    }))
  })
}

const CustomZodValidationPipe = createZodValidationPipe({ createValidationException })

export default CustomZodValidationPipe
