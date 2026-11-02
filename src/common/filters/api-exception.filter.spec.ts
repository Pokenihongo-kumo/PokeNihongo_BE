import { CommonMessage } from '@/i18n/message-keys'
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException
} from '@nestjs/common'
import { ApiExceptionFilter } from './api-exception.filter'

function run(exception: unknown, acceptLanguage?: string) {
  const json = jest.fn()
  const status = jest.fn(() => ({ json }))
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ headers: { 'accept-language': acceptLanguage } })
    })
  }
  const i18nService = {
    translate: jest.fn((key: string, lang: string) => `${lang}:${key}`)
  }
  new ApiExceptionFilter(i18nService as any).catch(exception, host as any)
  return {
    httpStatus: (status.mock.calls[0] as unknown[])[0],
    body: json.mock.calls[0][0]
  }
}

describe('ApiExceptionFilter', () => {
  beforeAll(() => {
    // Unexpected errors are logged; keep test output clean
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('turns an unexpected error into a translated 500 without internal details', () => {
    const { httpStatus, body } = run(new Error('db password is hunter2'), 'en')

    expect(httpStatus).toBe(500)
    expect(body).toEqual({
      statusCode: 500,
      message: `en:${CommonMessage.ERROR}`,
      error: 'INTERNAL_SERVER_ERROR'
    })
  })

  it('translates errorKey using Accept-Language (fallback vi)', () => {
    const exception = new NotFoundException({ message: 'x', errorKey: 'level.NOT_FOUND' })

    expect(run(exception, 'ja;q=0.9, en;q=0.8').body.message).toBe('ja:level.NOT_FOUND')
    expect(run(exception, 'fr').body.message).toBe('vi:level.NOT_FOUND')
  })

  it('keeps the 422 summary as a string and passes field errors through', () => {
    const exception = new UnprocessableEntityException({
      message: 'validation.INVALID_DATA',
      errorKey: 'validation.INVALID_DATA',
      errors: [{ field: 'name', message: 'required' }]
    })

    const { httpStatus, body } = run(exception, 'vi')

    expect(httpStatus).toBe(422)
    expect(body).toEqual({
      statusCode: 422,
      message: 'vi:validation.INVALID_DATA',
      error: 'UNPROCESSABLE_ENTITY',
      errors: [{ field: 'name', message: 'required' }]
    })
  })

  it('joins an array message so message is always a string', () => {
    const { body } = run(new BadRequestException(['first', 'second']))

    expect(body.message).toBe('first, second')
  })

  it('appends string data, never an object, and exposes dataRes when given', () => {
    const withText = new ConflictException({
      message: 'Pending payment',
      data: 'Invoice ID: 7',
      dataRes: { invoiceId: 7 }
    })
    const withObject = new ConflictException({
      message: 'Pending payment',
      data: { a: 1 }
    })

    expect(run(withText).body).toMatchObject({
      message: 'Pending payment: Invoice ID: 7',
      data: { invoiceId: 7 }
    })
    expect(run(withObject).body.message).toBe('Pending payment')
    expect(run(withObject).body).not.toHaveProperty('data')
  })
})
