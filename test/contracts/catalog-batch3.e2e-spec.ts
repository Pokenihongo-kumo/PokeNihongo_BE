import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 3 baseline: meaning, translation, kanji-reading (the rest of
// the catalog group; lesson-content waits for ADR D1/D2). No web or mobile code
// calls these routes, so this records today's answers, success and errors, errors
// in vi and en. The refactor must keep these snapshots; intended changes update
// them in the same commit.
describe('Catalog batch 3 contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let vocabularyId: number
  let kanjiId: number
  let languageId: number
  const created = { languages: [] as number[] }
  const KEY = 'contractBatchThree'
  const KANJI = '龘'

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
      .auth(token, { type: 'bearer' })
  const capture = (res: request.Response) => ({
    httpStatus: res.status,
    body: responseShape(res.body)
  })
  const both = async (send: (lang: string) => request.Test) => ({
    vi: capture(await send('vi')),
    en: capture(await send('en'))
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
      created.languages.push((await prisma.languages.create({ data: { code, name } })).id)
    }
    languageId = (await prisma.languages.findUniqueOrThrow({ where: { code: 'vi' } })).id
    if (await prisma.kanji.findUnique({ where: { character: KANJI } })) {
      throw new Error(`kanji ${KANJI} already exists in the test DB`)
    }
    vocabularyId = (
      await prisma.vocabulary.create({ data: { wordJp: '試験語', reading: 'しけんご' } })
    ).id
    kanjiId = (
      await prisma.kanji.create({
        data: { character: KANJI, meaningKey: `${KEY}.kanji.meaning` }
      })
    ).id
    token = await loginAsTestAdmin(app, [
      { method: 'GET', path: '/meaning' },
      { method: 'GET', path: '/meaning/:vocabularyId' },
      { method: 'POST', path: '/meaning' },
      { method: 'PUT', path: '/meaning/:id' },
      { method: 'DELETE', path: '/meaning/:id' },
      { method: 'DELETE', path: '/meaning/by-vocabulary/:vocabularyId' },
      { method: 'GET', path: '/translation' },
      { method: 'GET', path: '/translation/by-key' },
      { method: 'GET', path: '/translation/by-language' },
      { method: 'GET', path: '/translation/:id' },
      { method: 'POST', path: '/translation' },
      { method: 'POST', path: '/translation/bulk' },
      { method: 'PUT', path: '/translation/:id' },
      { method: 'DELETE', path: '/translation/:id' },
      { method: 'DELETE', path: '/translation/by-key/:key' },
      { method: 'GET', path: '/kanji-reading' },
      { method: 'GET', path: '/kanji-reading/stats' },
      { method: 'GET', path: '/kanji-reading/stats/reading-types' },
      { method: 'GET', path: '/kanji-reading/kanji/:kanjiId' },
      { method: 'GET', path: '/kanji-reading/type/:readingType' },
      { method: 'GET', path: '/kanji-reading/:id' },
      { method: 'POST', path: '/kanji-reading' },
      { method: 'PUT', path: '/kanji-reading/:id' },
      { method: 'DELETE', path: '/kanji-reading/:id' },
      { method: 'DELETE', path: '/kanji-reading/kanji/:kanjiId' }
    ])
  })

  // Leave the test DB as it was
  afterAll(async () => {
    if (prisma) {
      const meanings = await prisma.meaning.findMany({ where: { vocabularyId } })
      const keys = meanings.flatMap((m) =>
        [m.meaningKey, m.exampleSentenceKey, m.explanationKey].filter(
          (k): k is string => !!k
        )
      )
      await prisma.translation.deleteMany({
        where: { OR: [{ key: { in: keys } }, { key: { startsWith: KEY } }] }
      })
      // meanings and readings cascade
      if (vocabularyId) await prisma.vocabulary.delete({ where: { id: vocabularyId } })
      if (kanjiId) await prisma.kanji.delete({ where: { id: kanjiId } })
      await prisma.languages.deleteMany({ where: { id: { in: created.languages } } })
    }
    await app?.close()
  })

  describe('meaning', () => {
    let id: number

    it('create, list, by vocabulary, update', async () => {
      const create = await http()
        .post('/meaning')
        .send({ vocabularyId, exampleSentenceJp: '試験語を使う。' })
      // POST answers 500 but saves the row: take the id from the DB
      id = (await prisma.meaning.findFirstOrThrow({ where: { vocabularyId } })).id
      expect({
        create: capture(create),
        list: capture(
          await http()
            .get('/meaning')
            .query({ page: '1', limit: '5', vocabularyId: `${vocabularyId}` })
        ),
        byVocabulary: capture(await http().get(`/meaning/${vocabularyId}`)),
        update: capture(
          await http().put(`/meaning/${id}`).send({ exampleSentenceJp: '試験語です。' })
        )
      }).toMatchSnapshot()
    })

    it('errors, delete, delete by vocabulary', async () => {
      expect({
        invalidBody: await both((l) =>
          http(l).post('/meaning').send({ vocabularyId: 0 })
        ),
        missingVocabulary: await both((l) =>
          http(l).post('/meaning').send({ vocabularyId: 999999 })
        ),
        byVocabularyInvalid: await both((l) => http(l).get('/meaning/abc')),
        updateNotFound: await both((l) =>
          http(l).put('/meaning/999999').send({ exampleSentenceJp: 'なし' })
        ),
        updateInvalidId: await both((l) =>
          http(l).put('/meaning/abc').send({ exampleSentenceJp: 'なし' })
        ),
        delete: capture(await http().delete(`/meaning/${id}`)),
        deleteAgain: await both((l) => http(l).delete(`/meaning/${id}`)),
        deleteByVocabulary: capture(
          await http().delete(`/meaning/by-vocabulary/${vocabularyId}`)
        )
      }).toMatchSnapshot()
    })
  })

  describe('translation', () => {
    let id: number

    it('create, bulk, list, by key, by language, detail, update', async () => {
      const create = await http()
        .post('/translation')
        .send({ languageId, key: `${KEY}.title`, value: 'Tiêu đề' })
      id = create.body.data?.id
      expect({
        create: capture(create),
        bulk: capture(
          await http()
            .post('/translation/bulk')
            .send([
              { languageId, key: `${KEY}.bulk.one`, value: 'Một' },
              { languageId, key: `${KEY}.bulk.two`, value: 'Hai' }
            ])
        ),
        list: capture(
          await http()
            .get('/translation')
            .query({ page: '1', limit: '5', key: `${KEY}.title` })
        ),
        byKey: capture(
          await http()
            .get('/translation/by-key')
            .query({ key: `${KEY}.title` })
        ),
        byLanguage: capture(
          await http()
            .get('/translation/by-language')
            .query({ languageId: `${languageId}`, page: '1', limit: '2' })
        ),
        detail: capture(await http().get(`/translation/${id}`)),
        update: capture(
          await http().put(`/translation/${id}`).send({ value: 'Tiêu đề mới' })
        )
      }).toMatchSnapshot()
    })

    it('errors, delete, delete by key', async () => {
      expect({
        duplicate: await both((l) =>
          http(l)
            .post('/translation')
            .send({ languageId, key: `${KEY}.title`, value: 'x' })
        ),
        invalidBody: await both((l) =>
          http(l).post('/translation').send({ languageId: 0, key: '', value: '' })
        ),
        // The key rule's own example ("lesson.1.title") has a numeric segment
        numericKeySegment: await both((l) =>
          http(l)
            .post('/translation')
            .send({ languageId, key: `${KEY}.1.title`, value: 'x' })
        ),
        notFound: await both((l) => http(l).get('/translation/999999')),
        invalidId: await both((l) => http(l).get('/translation/abc')),
        byKeyMissing: await both((l) => http(l).get('/translation/by-key')),
        delete: capture(await http().delete(`/translation/${id}`)),
        deleteAgain: await both((l) => http(l).delete(`/translation/${id}`)),
        deleteByKey: capture(await http().delete(`/translation/by-key/${KEY}.bulk.one`))
      }).toMatchSnapshot()
    })
  })

  describe('kanji-reading', () => {
    let id: number

    it('create, list, stats, by kanji, by type, detail, update', async () => {
      const create = await http()
        .post('/kanji-reading')
        .send({ kanjiId, readingType: 'onyomi', reading: 'トウ' })
      // POST answers 500 but saves the row: take the id from the DB
      id = (await prisma.kanji_Reading.findFirstOrThrow({ where: { kanjiId } })).id
      expect({
        create: capture(create),
        list: capture(
          await http()
            .get('/kanji-reading')
            .query({ page: '1', limit: '5', kanjiId: `${kanjiId}` })
        ),
        stats: capture(await http().get('/kanji-reading/stats')),
        statsByType: capture(await http().get('/kanji-reading/stats/reading-types')),
        byKanji: capture(await http().get(`/kanji-reading/kanji/${kanjiId}`)),
        byType: capture(await http().get('/kanji-reading/type/onyomi')),
        detail: capture(await http().get(`/kanji-reading/${id}`)),
        update: capture(
          await http().put(`/kanji-reading/${id}`).send({ reading: 'ドウ' })
        )
      }).toMatchSnapshot()
    })

    it('errors, delete, delete by kanji', async () => {
      expect({
        invalidBody: await both((l) =>
          http(l)
            .post('/kanji-reading')
            .send({ kanjiId, readingType: 'x', reading: 'abc' })
        ),
        missingKanji: await both((l) =>
          http(l)
            .post('/kanji-reading')
            .send({ kanjiId: 999999, readingType: 'kunyomi', reading: 'たつ' })
        ),
        notFound: await both((l) => http(l).get('/kanji-reading/999999')),
        invalidId: await both((l) => http(l).get('/kanji-reading/abc')),
        byKanjiInvalid: await both((l) => http(l).get('/kanji-reading/kanji/abc')),
        delete: capture(await http().delete(`/kanji-reading/${id}`)),
        deleteAgain: await both((l) => http(l).delete(`/kanji-reading/${id}`)),
        deleteByKanji: capture(await http().delete(`/kanji-reading/kanji/${kanjiId}`))
      }).toMatchSnapshot()
    })
  })
})
