import { AppModule } from '@/app.module'
import { TextToSpeechService } from '@/modules/speech/text-to-speech.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// Phase 6 X5: the vocabulary and kanji TXT imports moved to their own
// services. No spec ran through them before. One new row each, imported
// twice: the first run creates it; the second is pinned as it behaves today
// (vocabulary: the word is listed in created with a 'Skipped create' note,
// not in skipped; kanji: counted as updated though nothing new is filled in).
// TTS is spied (no audio), storage is the local fake.
describe('TXT imports (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  const KATAKANA = 'アイウエオカキクケコサシスセソタチツテト'
  const wordJp =
    'インポト' +
    Array.from(
      { length: 6 },
      () => KATAKANA[Math.floor(Math.random() * KATAKANA.length)]
    ).join('')
  const KANJI = '龘'
  const createdLanguageCodes: string[] = []

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
      .auth(token, { type: 'bearer' })
  const upload = (path: string, field: string, content: string, lang = 'vi') =>
    http(lang).post(path).attach(field, Buffer.from(content, 'utf8'), {
      filename: 'import.txt',
      contentType: 'text/plain'
    })
  const shape = (res: request.Response) => ({
    httpStatus: res.status,
    body: responseShape(res.body)
  })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    prisma = app.get(PrismaService)
    for (const [code, name] of [
      ['vi', 'Tiếng Việt'],
      ['en', 'English']
    ]) {
      if (await prisma.languages.findUnique({ where: { code } })) continue
      await prisma.languages.create({ data: { code, name } })
      createdLanguageCodes.push(code)
    }
    jest
      .spyOn(TextToSpeechService.prototype, 'generateAudioFromText')
      .mockResolvedValue(null as never)
    jest
      .spyOn(TextToSpeechService.prototype, 'convertTextToSpeech')
      .mockRejectedValue(new Error('TTS is disabled in tests'))
    token = await loginAsTestAdmin(app, [
      { method: 'POST', path: '/vocabulary/import-txt' },
      { method: 'POST', path: '/kanji/import-txt' }
    ])
  })

  afterAll(async () => {
    jest.restoreAllMocks()
    if (prisma) {
      const words = await prisma.vocabulary.findMany({ where: { wordJp } })
      for (const { id } of words) {
        const meanings = await prisma.meaning.findMany({ where: { vocabularyId: id } })
        const keys = meanings
          .flatMap((m) => [m.meaningKey, m.exampleSentenceKey, m.explanationKey])
          .filter((key): key is string => !!key)
        await prisma.translation.deleteMany({ where: { key: { in: keys } } })
      }
      await prisma.vocabulary.deleteMany({ where: { wordJp } })
      const kanji = await prisma.kanji.findUnique({ where: { character: KANJI } })
      if (kanji) {
        await prisma.translation.deleteMany({ where: { key: kanji.meaningKey } })
        await prisma.kanji.delete({ where: { id: kanji.id } }) // readings cascade
      }
      await prisma.languages.deleteMany({ where: { code: { in: createdLanguageCodes } } })
    }
    await app?.close()
  })

  it('vocabulary: a new word, then the same file again', async () => {
    const file = `word\treading\tmeaning\n${wordJp}\tいんぽと\tnhập thử\n`
    const first = await upload('/vocabulary/import-txt', 'file', file)
    const again = await upload('/vocabulary/import-txt', 'file', file)
    expect(first.body.data.created).toHaveLength(1)
    expect(again.body.data.created.length + again.body.data.skipped.length).toBe(1)
    expect({
      first: shape(first),
      again: {
        ...shape(again),
        skippedReasons: again.body.data.skipped.map((s: { reason: string }) => s.reason)
      }
    }).toMatchSnapshot()
    expect(await prisma.vocabulary.count({ where: { wordJp } })).toBe(1)
  })

  it('kanji: a new kanji with its readings, then the same file again', async () => {
    const file = `kanji\tmean\tdetail\tkun\ton\tjlpt\tstrokes\n${KANJI}\tdragon\tmany dragons\tおおきい\tトウ\t1\t48\n`
    const first = await upload('/kanji/import-txt', 'file', file, 'en')
    const again = await upload('/kanji/import-txt', 'file', file, 'en')
    const counts = (res: request.Response) => ({
      created: res.body.data.created.length,
      updated: res.body.data.updated.length,
      skipped: res.body.data.skipped.length
    })
    expect({
      first: { ...shape(first), counts: counts(first) },
      again: { ...shape(again), counts: counts(again) }
    }).toMatchSnapshot()
    const kanji = await prisma.kanji.findUnique({
      where: { character: KANJI },
      include: { readings: true }
    })
    expect(kanji).toMatchObject({ strokeCount: 48, jlptLevel: 1 })
    expect(kanji!.readings.map((r) => r.reading).sort()).toEqual(['おおきい', 'トウ'])
  })
})
