import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 4c baseline: vocabulary and kanji. The vocabulary routes the
// clients use for creating, listing and searching are covered field by field in
// test/vocabulary/vocabulary-flow.e2e-spec.ts; this file adds what it does not
// cover (statistics, delete, the errors in vi and en) and the kanji routes the
// admin web calls (src/services/kanji, sent with the web's own query names).
// The refactor must keep these snapshots; intended changes update them.
describe('Vocabulary/kanji batch 4c contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  let startedAt: Date
  const created = { languages: [] as number[] }
  // A rare kanji, so the run does not meet an existing row
  const character = '龘'

  const http = (lang = 'vi') =>
    request
      .agent(app.getHttpServer())
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
      .auth(token, { type: 'bearer' })
  // Some messages carry a record id, which changes every run: ids become N
  const capture = (res: request.Response) => {
    const body = responseShape(res.body) as Record<string, unknown>
    if (typeof body?.message === 'string') {
      body.message = body.message.replace(/[0-9]+/g, 'N')
    }
    return { httpStatus: res.status, body }
  }
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
    token = await loginAsTestAdmin(app, [
      { method: 'GET', path: '/vocabulary/statistics' },
      { method: 'GET', path: '/vocabulary/search/:id' },
      { method: 'PUT', path: '/vocabulary/by-word/:wordJp' },
      { method: 'DELETE', path: '/vocabulary/:id' },
      { method: 'GET', path: '/kanji' },
      { method: 'GET', path: '/kanji/management' },
      { method: 'POST', path: '/kanji/with-meanings' },
      { method: 'PUT', path: '/kanji/:identifier/with-meanings' },
      { method: 'DELETE', path: '/kanji/:id' }
    ])
    startedAt = new Date()
  })

  // Leave the test DB as it was (readings cascade from their kanji)
  afterAll(async () => {
    if (prisma && startedAt) {
      const since = { createdAt: { gte: startedAt } }
      await prisma.kanji.deleteMany({ where: { character } })
      await prisma.vocabulary.deleteMany({ where: since })
      await prisma.translation.deleteMany({ where: since })
      await prisma.languages.deleteMany({ where: { id: { in: created.languages } } })
    }
    await app?.close()
  })

  describe('vocabulary', () => {
    it('statistics, delete, delete again', async () => {
      const word = await prisma.vocabulary.create({
        data: { wordJp: '契約語彙', reading: 'けいやくごい', levelN: 5 }
      })
      expect({
        statistics: capture(await http().get('/vocabulary/statistics')),
        delete: capture(await http().delete(`/vocabulary/${word.id}`)),
        deleteAgain: await both((l) => http(l).delete(`/vocabulary/${word.id}`))
      }).toMatchSnapshot()
    })

    it('errors (web and mobile routes)', async () => {
      expect({
        detailNotFound: await both((l) => http(l).get('/vocabulary/search/999999')),
        detailInvalidId: await both((l) => http(l).get('/vocabulary/search/abc')),
        deleteInvalidId: await both((l) => http(l).delete('/vocabulary/abc')),
        updateNotFound: await both((l) =>
          http(l)
            .put(`/vocabulary/by-word/${encodeURIComponent('存在しない語')}`)
            .query({ regenerateAudio: 'false' })
            .field('reading', 'そんざいしないご')
        )
      }).toMatchSnapshot()
    })
  })

  describe('kanji', () => {
    let kanjiId: number

    it('create, list (web query names), management list, update', async () => {
      const create = await http()
        .post('/kanji/with-meanings')
        .send({
          character,
          strokeCount: 48,
          jlptLevel: 1,
          readings: [{ readingType: 'onyomi', reading: 'トウ' }],
          meanings: [{ translations: { vi: 'rồng bay', en: 'dragons flying' } }]
        })
      kanjiId =
        create.body.data?.kanji?.id ??
        create.body.data?.id ??
        (await prisma.kanji.findUniqueOrThrow({ where: { character } })).id
      const webQuery = { page: '1', limit: '5', search: character, sortOrder: 'desc' }
      expect({
        create: capture(create),
        list: capture(await http().get('/kanji').query(webQuery)),
        management: capture(await http().get('/kanji/management').query(webQuery)),
        update: capture(
          await http().put(`/kanji/${kanjiId}/with-meanings`).send({ strokeCount: 47 })
        )
      }).toMatchSnapshot()
    })

    it('errors, delete, delete again', async () => {
      expect({
        createInvalid: await both((l) =>
          http(l).post('/kanji/with-meanings').send({ character: '', jlptLevel: 9 })
        ),
        createDuplicate: await both((l) =>
          http(l).post('/kanji/with-meanings').send({ character, jlptLevel: 1 })
        ),
        updateNotFound: await both((l) =>
          http(l).put('/kanji/999999/with-meanings').send({ strokeCount: 3 })
        ),
        deleteInvalidId: await both((l) => http(l).delete('/kanji/abc')),
        delete: capture(await http().delete(`/kanji/${kanjiId}`)),
        deleteAgain: await both((l) => http(l).delete(`/kanji/${kanjiId}`))
      }).toMatchSnapshot()
    })
  })
})
