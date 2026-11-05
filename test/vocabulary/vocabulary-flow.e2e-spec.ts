import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// C2 sample flow across the three repos, at the HTTP level:
// web admin creates a word (POST /vocabulary/full, as services/vocabulary
// sends it) -> it shows in the web list -> mobile search and detail
// (services/dictionary) read it in the request language -> web updates and
// deletes it. Each step checks the fields the clients' Zod schemas require.
describe('Vocabulary: web create -> mobile search (e2e)', () => {
  let app: INestApplication<App>
  let token: string
  let generateAudio: jest.SpyInstance
  let regenerateAudio: jest.SpyInstance
  // Unique katakana word per run so reruns never collide with an earlier one
  const KATAKANA = 'アイウエオカキクケコサシスセソタチツテト'
  const wordJp =
    'テスト' +
    Array.from(
      { length: 6 },
      () => KATAKANA[Math.floor(Math.random() * KATAKANA.length)]
    ).join('')
  let vocabularyId: number
  let prisma: PrismaService
  const createdLanguageCodes: string[] = []

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
      .auth(token, { type: 'bearer' })

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
    // No real TTS in tests. Several modules provide their own instance, so spy
    // on the prototype: create uses generateAudioFromText, update
    // (regenerateAudio=true) uses convertTextToSpeech
    generateAudio = jest
      .spyOn(TextToSpeechService.prototype, 'generateAudioFromText')
      .mockResolvedValue(null as never)
    regenerateAudio = jest
      .spyOn(TextToSpeechService.prototype, 'convertTextToSpeech')
      .mockRejectedValue(new Error('TTS is disabled in tests'))

    token = await loginAsTestAdmin(app, [
      { method: 'POST', path: '/vocabulary/full' },
      { method: 'GET', path: '/vocabulary' },
      { method: 'GET', path: '/vocabulary/search' },
      { method: 'GET', path: '/vocabulary/search/:id' },
      { method: 'GET', path: '/vocabulary/search-history' },
      { method: 'PUT', path: '/vocabulary/by-word/:wordJp' },
      { method: 'DELETE', path: '/vocabulary/:id' }
    ])
  })

  // Leave the test DB as it was: other specs (contract snapshots) read the same tables
  afterAll(async () => {
    jest.restoreAllMocks()
    if (prisma) {
      await prisma.vocabularySearchHistory.deleteMany({
        where: { searchKeyword: wordJp }
      })
      if (vocabularyId) {
        const meanings = await prisma.meaning.findMany({ where: { vocabularyId } })
        const keys = meanings
          .flatMap((m) => [m.meaningKey, m.exampleSentenceKey, m.explanationKey])
          .filter((key): key is string => !!key)
        await prisma.translation.deleteMany({ where: { key: { in: keys } } })
        // Hard delete; meanings cascade
        await prisma.vocabulary.deleteMany({ where: { id: vocabularyId } })
      }
      // Cascades to their translations
      await prisma.languages.deleteMany({ where: { code: { in: createdLanguageCodes } } })
    }
    await app?.close()
  })

  it('web: creates the word with translations (multipart, as the admin form sends it)', async () => {
    const res = await http()
      .post('/vocabulary/full')
      .field('word_jp', wordJp)
      .field('reading', 'てすと')
      .field('level_n', '5')
      .field(
        'translations',
        JSON.stringify({
          meaning: [
            { language_code: 'vi', value: 'từ kiểm thử' },
            { language_code: 'en', value: 'test word' }
          ]
        })
      )

    expect(res.status).toBe(201)
    expect(res.body.statusCode).toBe(201)
    expect(res.body.data).toMatchObject({ vocabulary: { wordJp }, isNew: true })
    vocabularyId = res.body.data.vocabulary.id
    expect(typeof vocabularyId).toBe('number')
    expect(generateAudio).toHaveBeenCalledTimes(1)
  })

  it('web: the list returns it with the fields the admin table renders', async () => {
    const res = await http().get('/vocabulary').query({ search: wordJp })

    expect(res.status).toBe(200)
    expect(res.body.data.pagination).toEqual(
      expect.objectContaining({ current: 1, totalItem: 1 })
    )
    expect(res.body.data.results[0]).toMatchObject({
      id: vocabularyId,
      wordJp,
      reading: 'てすと',
      levelN: 5
    })
  })

  it('mobile: search finds it with the meaning in the request language', async () => {
    const vi = await http('vi').get('/vocabulary/search').query({ keyword: wordJp })
    const en = await http('en').get('/vocabulary/search').query({ keyword: wordJp })

    expect(vi.status).toBe(200)
    expect(vi.body.data.results).toEqual([
      { id: vocabularyId, wordJp, reading: 'てすと', meaning: 'từ kiểm thử' }
    ])
    expect(en.body.data.results[0].meaning).toBe('test word')
  })

  it('mobile: detail has every field the dictionary screen reads', async () => {
    const res = await http('vi').get(`/vocabulary/search/${vocabularyId}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual(
      expect.objectContaining({
        id: vocabularyId,
        wordJp,
        reading: 'てすと',
        audioUrl: null,
        imageUrl: null,
        levelN: 5,
        kanjiMeaning: expect.any(String),
        relatedWords: expect.any(Array)
      })
    )
    expect(res.body.data.meanings[0]).toEqual(
      expect.objectContaining({ meaning: 'từ kiểm thử', exampleSentenceJp: null })
    )
  })

  it('mobile: the search is recorded in the search history', async () => {
    const res = await http().get('/vocabulary/search-history').query({ pageSize: '50' })

    expect(res.status).toBe(200)
    expect(
      res.body.data.results.map((h: { searchKeyword: string }) => h.searchKeyword)
    ).toContain(wordJp)
  })

  it('web: update with regenerateAudio=false keeps the audio (no TTS call)', async () => {
    regenerateAudio.mockClear()
    const res = await http()
      .put(`/vocabulary/by-word/${encodeURIComponent(wordJp)}`)
      .query({ regenerateAudio: 'false' })
      .field('wordJp', wordJp)
      .field('reading', 'てすとご')

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ id: vocabularyId, reading: 'てすとご' })
    expect(regenerateAudio).not.toHaveBeenCalled()
  })

  it('web: update rejects a regenerateAudio value that is not a boolean', async () => {
    const res = await http()
      .put(`/vocabulary/by-word/${encodeURIComponent(wordJp)}`)
      .query({ regenerateAudio: 'maybe' })
      .field('reading', 'てすと')

    expect(res.status).toBe(400)
    expect(res.body.statusCode).toBe(400)
  })

  it('web: create rejects a body without reading (422 with field errors)', async () => {
    const res = await http()
      .post('/vocabulary/full')
      .field('word_jp', wordJp)
      .field(
        'translations',
        JSON.stringify({ meaning: [{ language_code: 'vi', value: 'x' }] })
      )

    expect(res.status).toBe(422)
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'reading' })])
    )
  })

  it('web: delete, then mobile search no longer finds it', async () => {
    const del = await http().delete(`/vocabulary/${vocabularyId}`)
    expect(del.status).toBe(200)
    expect(del.body.data.id).toBe(vocabularyId)

    const search = await http().get('/vocabulary/search').query({ keyword: wordJp })
    expect(search.body.data.results).toEqual([])
    const detail = await http().get(`/vocabulary/search/${vocabularyId}`)
    expect(detail.status).toBe(404)
  })
})
