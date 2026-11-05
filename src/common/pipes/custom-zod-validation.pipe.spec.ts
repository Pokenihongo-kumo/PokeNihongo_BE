import { ValidationMessage } from '@/i18n/message-keys'
import { z } from 'zod'
import { createValidationException } from './custom-zod-validation.pipe'

const schema = z.object({
  name: z.string(),
  level: z.number(),
  items: z.array(z.object({ code: z.string().min(2) }))
})

function validationBody(input: unknown) {
  const result = schema.safeParse(input)
  if (result.success) throw new Error('expected invalid input')
  return createValidationException(result.error).getResponse() as Record<string, any>
}

describe('createValidationException', () => {
  it('returns a summary key and one entry per invalid field', () => {
    const body = validationBody({ level: 'high', items: [{ code: 'x' }] })

    expect(body.errorKey).toBe(ValidationMessage.INVALID_DATA)
    expect(body.errors).toEqual([
      { field: 'name', messageKey: ValidationMessage.REQUIRED },
      { field: 'level', messageKey: ValidationMessage.INVALID_FORMAT },
      { field: 'items.0.code', messageKey: ValidationMessage.INVALID_DATA }
    ])
  })
})
