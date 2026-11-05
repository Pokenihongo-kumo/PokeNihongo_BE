import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// Phase 2 baseline: the HTTP contract of the two convention samples, WordType
// (style B) and Level (style A), before their refactor. Every route, success
// and error, vi and en. A refactor must keep these snapshots; an intended
// change (e.g. translated messages) updates them in the same commit.
describe('WordType and Level contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  const run = Date.now() % 100000
  const nameKey = `wordtype.contract${run}.name`
  // Far above real levels so auto-linking never touches them
  const levelNumber = 900000 + run
  const createdWordTypeIds: number[] = []
  const createdLevelIds: number[] = []

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
    // Known bug (fixed in the WordType task): the startup seed inserts word
    // types with explicit ids without moving the id sequence, so the next
    // POST /wordtype collides on the primary key. Sync it so this baseline
    // does not depend on how far the sequence happens to be.
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"WordType"', 'id'), (SELECT MAX(id) FROM "WordType"))`
    )
    token = await loginAsTestAdmin(app, [
      { method: 'GET', path: '/wordtype' },
      { method: 'GET', path: '/wordtype/stats' },
      { method: 'GET', path: '/wordtype/name-key/:nameKey' },
      { method: 'GET', path: '/wordtype/:id' },
      { method: 'POST', path: '/wordtype' },
      { method: 'PUT', path: '/wordtype/:id' },
      { method: 'DELETE', path: '/wordtype/:id' },
      { method: 'POST', path: '/level' },
      { method: 'PUT', path: '/level/:levelId' },
      { method: 'DELETE', path: '/level/:levelId' }
    ])
  })

  // Leave the test DB as it was
  afterAll(async () => {
    if (prisma) {
      await prisma.wordType.deleteMany({ where: { id: { in: createdWordTypeIds } } })
      await prisma.level.deleteMany({ where: { id: { in: createdLevelIds } } })
    }
    await app?.close()
  })

  describe('WordType', () => {
    let id: number

    it('create', async () => {
      const res = await http().post('/wordtype').send({ nameKey })
      id = res.body.data?.id
      if (id) createdWordTypeIds.push(id)
      expect(capture(res)).toMatchSnapshot()
    })

    it('list', async () => {
      expect(
        capture(await http().get('/wordtype').query({ page: '1', limit: '2' }))
      ).toMatchSnapshot()
    })

    it('stats', async () => {
      expect(capture(await http().get('/wordtype/stats'))).toMatchSnapshot()
    })

    it('detail by id and by nameKey', async () => {
      expect({
        byId: capture(await http().get(`/wordtype/${id}`)),
        byNameKey: capture(await http().get(`/wordtype/name-key/${nameKey}`))
      }).toMatchSnapshot()
    })

    it('update', async () => {
      expect(
        capture(
          await http()
            .put(`/wordtype/${id}`)
            .send({ nameKey: `${nameKey}.v2` })
        )
      ).toMatchSnapshot()
    })

    it('errors: duplicate, not found, invalid body, invalid id', async () => {
      expect({
        duplicate: await both((lang) =>
          http(lang)
            .post('/wordtype')
            .send({ nameKey: `${nameKey}.v2` })
        ),
        notFound: await both((lang) => http(lang).get('/wordtype/999999')),
        notFoundByNameKey: await both((lang) =>
          http(lang).get('/wordtype/name-key/wordtype.none.name')
        ),
        invalidBody: await both((lang) =>
          http(lang).post('/wordtype').send({ nameKey: '1bad key' })
        ),
        invalidId: await both((lang) => http(lang).get('/wordtype/abc'))
      }).toMatchSnapshot()
    })

    it('delete, then delete again', async () => {
      expect({
        first: capture(await http().delete(`/wordtype/${id}`)),
        again: await both((lang) => http(lang).delete(`/wordtype/${id}`))
      }).toMatchSnapshot()
    })
  })

  describe('Level', () => {
    let id: number

    it('create', async () => {
      const res = await http()
        .post('/level')
        .send({ levelNumber, requiredExp: 100, levelType: 'USER' })
      id = res.body.data?.id
      if (id) createdLevelIds.push(id)
      expect(capture(res)).toMatchSnapshot()
    })

    it('detail', async () => {
      expect(capture(await http().get(`/level/${id}`))).toMatchSnapshot()
    })

    it('update', async () => {
      expect(
        capture(await http().put(`/level/${id}`).send({ requiredExp: 150 }))
      ).toMatchSnapshot()
    })

    it('errors: duplicate, wrong next level, invalid id, invalid body', async () => {
      expect({
        duplicate: await both((lang) =>
          http(lang)
            .post('/level')
            .send({ levelNumber, requiredExp: 100, levelType: 'USER' })
        ),
        wrongNextLevel: await both((lang) =>
          http(lang).put(`/level/${id}`).send({ nextLevelId: id })
        ),
        invalidId: await both((lang) => http(lang).get('/level/abc')),
        invalidBody: await both((lang) =>
          http(lang)
            .post('/level')
            .send({ levelNumber: 0, requiredExp: -1, levelType: 'USER' })
        )
      }).toMatchSnapshot()
    })

    it('delete, then delete again', async () => {
      expect({
        first: capture(await http().delete(`/level/${id}`)),
        again: await both((lang) => http(lang).delete(`/level/${id}`))
      }).toMatchSnapshot()
    })
  })
})
