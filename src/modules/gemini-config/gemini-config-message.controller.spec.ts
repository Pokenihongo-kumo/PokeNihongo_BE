import { TransformInterceptor } from '@/common/interceptor/transform.interceptor'
import { I18nService } from '@/i18n/i18n.service'
import { Reflector } from '@nestjs/core'
import { lastValueFrom, of } from 'rxjs'
import { GeminiConfigController } from './gemini-config.controller'

// The gemini-config routes translated bare keys ('GET_SUCCESS', ...) that no
// language file has, so every response carried the key itself as message.
// They now use ENTITY_MESSAGE keys, translated in the request language (P5d).
const run = (handler: (...args: never[]) => unknown, result: unknown, lang: string) =>
  lastValueFrom(
    new TransformInterceptor(new Reflector(), new I18nService()).intercept(
      {
        getHandler: () => handler,
        switchToHttp: () => ({
          getResponse: () => ({ statusCode: 200 }),
          getRequest: () => ({ headers: { 'accept-language': lang } })
        })
      } as never,
      { handle: () => of(result) }
    )
  ) as Promise<{ message: string; data: unknown }>

describe('GeminiConfigController messages', () => {
  it('a translated sentence, not the bare key', async () => {
    const service = { listModels: jest.fn().mockResolvedValue([{ name: 'm' }]) }
    const controller = new GeminiConfigController(service as never, {} as never)
    const result = await controller.listModels('vi')
    const handler = GeminiConfigController.prototype.listModels

    const vi = await run(handler, result, 'vi')
    expect(vi).toEqual({
      statusCode: 200,
      message: 'Lấy chi tiết bản ghi thành công',
      data: [{ name: 'm' }]
    })
    expect((await run(handler, result, 'en')).message).toBe(
      'Record retrieved successfully'
    )
  })
})
