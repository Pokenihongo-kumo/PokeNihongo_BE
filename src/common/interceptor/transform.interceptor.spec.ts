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
})
