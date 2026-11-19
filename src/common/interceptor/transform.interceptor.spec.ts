import { lastValueFrom, of } from 'rxjs'
import { TransformInterceptor } from './transform.interceptor'

function run(handlerResult: unknown, httpStatus: number) {
  const context = {
    switchToHttp: () => ({ getResponse: () => ({ statusCode: httpStatus }) })
  }
  return lastValueFrom(
    new TransformInterceptor().intercept(context as any, {
      handle: () => of(handlerResult)
    })
  )
}

describe('TransformInterceptor', () => {
  it('uses the HTTP status even when the service sets another statusCode', async () => {
    const body = await run({ statusCode: 201, message: 'ok', data: { id: 1 } }, 200)

    expect(body).toEqual({ statusCode: 200, message: 'ok', data: { id: 1 } })
  })

  it('wraps a plain result in the envelope with the HTTP status', async () => {
    const body = await run([1, 2], 201)

    expect(body).toEqual({ statusCode: 201, data: [1, 2] })
  })

  it('turns a message-only result into an envelope with data null', async () => {
    expect(await run({ message: 'Deleted' }, 200)).toEqual({
      statusCode: 200,
      message: 'Deleted',
      data: null
    })
    // the service's own statusCode (e.g. 204) is ignored like for envelopes
    expect(await run({ statusCode: 204, message: 'Deleted' }, 200)).toEqual({
      statusCode: 200,
      message: 'Deleted',
      data: null
    })
  })

  it('still wraps other objects as data, including ones whose message is content', async () => {
    expect(await run({ message: 'AI reply', conversationId: 'c1' }, 200)).toEqual({
      statusCode: 200,
      data: { message: 'AI reply', conversationId: 'c1' }
    })
    expect(await run({ supported: true }, 200)).toEqual({
      statusCode: 200,
      data: { supported: true }
    })
    expect(await run(undefined, 200)).toEqual({ statusCode: 200, data: undefined })
  })
})
