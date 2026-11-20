import { I18nService } from '@/i18n/i18n.service'
import { VocabularyMessage } from '@/i18n/message-keys'
import { msg, ResponseMessage } from '@/i18n/response-message'
import { Reflector } from '@nestjs/core'
import { lastValueFrom, of } from 'rxjs'
import { TransformInterceptor } from './transform.interceptor'

// handler: the route method (its @ResponseMessage metadata is read)
function run(
  handlerResult: unknown,
  httpStatus: number,
  { handler = () => undefined, lang }: { handler?: () => unknown; lang?: string } = {}
) {
  const context = {
    getHandler: () => handler,
    switchToHttp: () => ({
      getResponse: () => ({ statusCode: httpStatus }),
      getRequest: () => ({ headers: lang ? { 'accept-language': lang } : {} })
    })
  }
  return lastValueFrom(
    new TransformInterceptor(new Reflector(), new I18nService()).intercept(
      context as any,
      {
        handle: () => of(handlerResult)
      }
    )
  )
}

class Routes {
  @ResponseMessage(VocabularyMessage.GET_SUCCESS)
  fixed() {}
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

  it('@ResponseMessage: the handler returns its data, the message is translated', async () => {
    const handler = Routes.prototype.fixed
    expect(await run({ id: 1 }, 200, { handler })).toEqual({
      statusCode: 200,
      message: 'Lấy thông tin từ vựng thành công',
      data: { id: 1 }
    })
    expect(await run({ id: 1 }, 200, { handler, lang: 'en-US,en;q=0.9' })).toMatchObject({
      message: 'Word retrieved successfully'
    })
    // nothing returned (a delete) or null (not found as null): data null
    expect(await run(undefined, 200, { handler })).toMatchObject({ data: null })
    expect(await run(null, 200, { handler })).toMatchObject({ data: null })
  })

  it('msg(): a message the handler picks or fills, translated in place', async () => {
    expect(
      await run(
        { message: msg(VocabularyMessage.CREATE_SAMPLE_SUCCESS, { count: 3 }), data: [] },
        201
      )
    ).toEqual({
      statusCode: 201,
      message: 'Tạo từ vựng mẫu thành công. Đã tạo 3 từ vựng',
      data: []
    })
    // message only: still an envelope with data null
    expect(await run({ message: msg(VocabularyMessage.DELETE_SUCCESS) }, 200)).toEqual({
      statusCode: 200,
      message: 'Xóa từ vựng thành công',
      data: null
    })
  })
})
