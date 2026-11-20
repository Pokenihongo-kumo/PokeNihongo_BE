import { TransformInterceptor } from '@/common/interceptor/transform.interceptor'
import { I18nService } from '@/i18n/i18n.service'
import { Reflector } from '@nestjs/core'
import { lastValueFrom, of } from 'rxjs'
import { KanjiController } from './kanji.controller'

// P5d (D-P5d-4): delete-all and the two imports answered in Vietnamese
// whatever the request language; they now follow Accept-Language like every
// other route. The Vietnamese text is the same as before.
const through = (result: unknown, lang: string) =>
  lastValueFrom(
    new TransformInterceptor(new Reflector(), new I18nService()).intercept(
      {
        getHandler: () => () => undefined,
        switchToHttp: () => ({
          getResponse: () => ({ statusCode: 200 }),
          getRequest: () => ({ headers: { 'accept-language': lang } })
        })
      } as never,
      { handle: () => of(result) }
    )
  ) as Promise<{ message: string }>

describe('KanjiController messages in the request language', () => {
  const service = {
    deleteAllKanjiData: jest
      .fn()
      .mockResolvedValue({ kanjiDeleted: 2, readingDeleted: 3, translationDeleted: 4 }),
    importFromXlsx: jest.fn().mockResolvedValue({
      data: { created: [1], updated: [], skipped: [1, 2] }
    }),
    importFromTxt: jest.fn().mockResolvedValue({
      data: { language: 'en', created: [1, 2], updated: [1], skipped: [] }
    })
  }
  const controller = new KanjiController(service as never)
  const file = {} as Express.Multer.File

  it('delete all', async () => {
    const result = await controller.deleteAllKanjiData()
    expect((await through(result, 'vi')).message).toBe(
      'Đã xóa toàn bộ dữ liệu Kanji thành công. Đã xóa 2 Kanji, 3 cách đọc, 4 bản dịch'
    )
    expect((await through(result, 'en')).message).toBe(
      'All kanji data deleted: 2 kanji, 3 readings, 4 translations'
    )
  })

  it('import xlsx and txt', async () => {
    const xlsx = await controller.importKanji(file)
    expect((await through(xlsx, 'vi')).message).toBe(
      'Import Kanji thành công: 1 tạo mới, 0 cập nhật, 2 bỏ qua'
    )
    expect((await through(xlsx, 'en')).message).toBe(
      'Kanji imported: 1 created, 0 updated, 2 skipped'
    )
    const txt = await controller.importKanjiFromTxt(file)
    expect((await through(txt, 'en')).message).toBe(
      'Kanji imported from TXT (en): 2 created, 1 updated, 0 skipped'
    )
  })
})
