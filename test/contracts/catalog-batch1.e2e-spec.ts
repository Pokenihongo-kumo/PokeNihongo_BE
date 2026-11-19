import { AppModule } from '@/app.module'
import { PrismaService } from '@/shared/services/prisma.service'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// Phase 3, batch 1 (catalog) baseline: every route of languages,
// elemental-type, type-effectiveness and attendence-config, success and
// errors, errors in vi and en. Web reads GET /elemental-type, mobile reads
// GET /elemental-type and GET /attendence-config. The refactor must keep these
// snapshots; intended changes update them in the same commit.
describe('Catalog batch 1 contract (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService
  let token: string
  const created = {
    languages: [] as number[],
    elemental: [] as number[],
    effect: [] as number[],
    attendance: [] as number[]
  }

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
    // Real databases have the vi/en language rows; attendence-config answers 404
    // to everything when the request language has no row (getLand)
    for (const [code, name] of [
      ['vi', 'Tiếng Việt'],
      ['en', 'English']
    ]) {
      if (await prisma.languages.findUnique({ where: { code } })) continue
      created.languages.push((await prisma.languages.create({ data: { code, name } })).id)
    }
    token = await loginAsTestAdmin(app, [
      { method: 'GET', path: '/languages' },
      { method: 'GET', path: '/languages/check/:code' },
      { method: 'GET', path: '/languages/:id' },
      { method: 'GET', path: '/languages/by-code/:code' },
      { method: 'POST', path: '/languages' },
      { method: 'PUT', path: '/languages/:id' },
      { method: 'PUT', path: '/languages/by-code/:code' },
      { method: 'DELETE', path: '/languages/:id' },
      { method: 'DELETE', path: '/languages/by-code/:code' },
      { method: 'POST', path: '/elemental-type' },
      { method: 'PUT', path: '/elemental-type/:elementId' },
      { method: 'DELETE', path: '/elemental-type/:elementId' },
      { method: 'POST', path: '/type-effectiveness' },
      { method: 'PUT', path: '/type-effectiveness/:typeEffectivenessId' },
      { method: 'DELETE', path: '/type-effectiveness/:typeEffectivenessId' },
      { method: 'GET', path: '/attendence-config' },
      { method: 'GET', path: '/attendence-config/:attendenceConfigId' },
      { method: 'POST', path: '/attendence-config' },
      { method: 'PUT', path: '/attendence-config/:attendenceConfigId' },
      { method: 'DELETE', path: '/attendence-config/:attendenceConfigId' }
    ])
  })

  // Leave the test DB as it was (hard delete; soft-deleted rows keep unique keys)
  afterAll(async () => {
    if (prisma) {
      await prisma.typeEffectiveness.deleteMany({ where: { id: { in: created.effect } } })
      await prisma.elementalType.deleteMany({ where: { id: { in: created.elemental } } })
      await prisma.attendanceConfig.deleteMany({
        where: { id: { in: created.attendance } }
      })
      await prisma.languages.deleteMany({ where: { id: { in: created.languages } } })
    }
    await app?.close()
  })

  describe('languages', () => {
    const code = 'zqx'
    let id: number

    it('create, list, check, detail by id and by code', async () => {
      const create = await http().post('/languages').send({ code, name: 'Thử nghiệm' })
      id = create.body.data?.id
      if (id) created.languages.push(id)
      expect({
        create: capture(create),
        list: capture(
          await http().get('/languages').query({ currentPage: '1', pageSize: '5' })
        ),
        check: capture(await http().get(`/languages/check/${code}`)),
        byId: capture(await http().get(`/languages/${id}`)),
        byCode: capture(await http().get(`/languages/by-code/${code}`))
      }).toMatchSnapshot()
    })

    it('update by id and by code', async () => {
      expect({
        byId: capture(
          await http().put(`/languages/${id}`).send({ name: 'Thử nghiệm hai' })
        ),
        byCode: capture(
          await http().put(`/languages/by-code/${code}`).send({ name: 'Thử ba' })
        )
      }).toMatchSnapshot()
    })

    it('errors: duplicate, not found, invalid body, invalid id', async () => {
      expect({
        duplicate: await both((l) =>
          http(l).post('/languages').send({ code, name: 'Trùng' })
        ),
        notFound: await both((l) => http(l).get('/languages/999999')),
        notFoundByCode: await both((l) => http(l).get('/languages/by-code/zzz')),
        invalidBody: await both((l) =>
          http(l).post('/languages').send({ code: 'X1', name: '' })
        ),
        invalidId: await both((l) => http(l).get('/languages/abc'))
      }).toMatchSnapshot()
    })

    it('create with the optional flag field', async () => {
      // The body accepts `flag` but the table has no such column (used to be 500)
      const res = await http()
        .post('/languages')
        .send({ code: 'zqy', name: 'Cờ', flag: 'x' })
      if (res.body.data?.id) created.languages.push(res.body.data.id)
      expect(capture(res)).toMatchSnapshot()
    })

    it('delete by code, then by id again', async () => {
      expect({
        byCode: capture(await http().delete(`/languages/by-code/${code}`)),
        again: await both((l) => http(l).delete(`/languages/${id}`))
      }).toMatchSnapshot()
    })
  })

  describe('elemental-type and type-effectiveness', () => {
    const display = (name: string) => ({ en: name, vi: name, ja: name })
    let fire: number
    let water: number
    let effect: number

    it('elemental-type: create, list (public), active, detail', async () => {
      const a = await http()
        .post('/elemental-type')
        .send({
          type_name: 'ctfire',
          display_name: display('Fire'),
          color_hex: '#FF0000'
        })
      const b = await http()
        .post('/elemental-type')
        .send({
          type_name: 'ctwater',
          display_name: display('Water'),
          color_hex: '#0000FF'
        })
      fire = a.body.data?.id
      water = b.body.data?.id
      created.elemental.push(...[fire, water].filter(Boolean))
      expect({
        create: capture(a),
        // Same requests as web (qs filter) and mobile (sort)
        listWeb: capture(
          await request(app.getHttpServer())
            .get('/elemental-type')
            .query({ qs: 'type_name:ctfire', currentPage: '1', pageSize: '10' })
        ),
        listMobile: capture(
          await request(app.getHttpServer())
            .get('/elemental-type')
            .query({ qs: 'sort:id', currentPage: '1' })
        ),
        active: capture(await request(app.getHttpServer()).get('/elemental-type/active')),
        detail: capture(await request(app.getHttpServer()).get(`/elemental-type/${fire}`))
      }).toMatchSnapshot()
    })

    it('elemental-type: update, errors', async () => {
      expect({
        update: capture(
          await http().put(`/elemental-type/${fire}`).send({ color_hex: '#EE0000' })
        ),
        duplicate: await both((l) =>
          http(l)
            .post('/elemental-type')
            .send({
              type_name: 'ctfire',
              display_name: display('Fire'),
              color_hex: '#FF0000'
            })
        ),
        notFound: await both((l) => http(l).get('/elemental-type/999999')),
        invalidBody: await both((l) =>
          http(l)
            .post('/elemental-type')
            .send({ type_name: '', display_name: {}, color_hex: 'red' })
        ),
        invalidId: await both((l) => http(l).get('/elemental-type/abc'))
      }).toMatchSnapshot()
    })

    it('type-effectiveness: create, list, matrix, weaknesses, resistances, multi-type, detail', async () => {
      const create = await http()
        .post('/type-effectiveness')
        .send({ attackerId: water, defenderId: fire, multiplier: 2 })
      effect = create.body.data?.id
      if (effect) created.effect.push(effect)
      const anon = () => request(app.getHttpServer())
      expect({
        create: capture(create),
        list: capture(
          await anon()
            .get('/type-effectiveness')
            .query({ currentPage: '1', pageSize: '5' })
        ),
        matrix: capture(await anon().get('/type-effectiveness/matrix')),
        weaknesses: capture(await anon().get(`/type-effectiveness/weaknesses/${fire}`)),
        resistances: capture(
          await anon().get(`/type-effectiveness/resistances/${water}`)
        ),
        multiType: capture(
          await anon()
            .post('/type-effectiveness/calculate-multi-type')
            .send({ defenderTypeIds: [fire] })
        ),
        detail: capture(await anon().get(`/type-effectiveness/${effect}`))
      }).toMatchSnapshot()
    })

    it('type-effectiveness: update, errors, delete', async () => {
      expect({
        update: capture(
          await http().put(`/type-effectiveness/${effect}`).send({ multiplier: 0.5 })
        ),
        duplicate: await both((l) =>
          http(l)
            .post('/type-effectiveness')
            .send({ attackerId: water, defenderId: fire, multiplier: 2 })
        ),
        sameType: await both((l) =>
          http(l)
            .post('/type-effectiveness')
            .send({ attackerId: fire, defenderId: fire, multiplier: 2 })
        ),
        badMultiplier: await both((l) =>
          http(l)
            .post('/type-effectiveness')
            .send({ attackerId: fire, defenderId: water, multiplier: 3 })
        ),
        notFound: await both((l) => http(l).get('/type-effectiveness/999999')),
        invalidId: await both((l) => http(l).get('/type-effectiveness/abc')),
        weaknessesInvalidId: await both((l) =>
          http(l).get('/type-effectiveness/weaknesses/abc')
        ),
        delete: capture(await http().delete(`/type-effectiveness/${effect}`)),
        deleteAgain: await both((l) => http(l).delete(`/type-effectiveness/${effect}`))
      }).toMatchSnapshot()
    })

    it('elemental-type: delete, then again', async () => {
      expect({
        delete: capture(await http().delete(`/elemental-type/${water}`)),
        again: await both((l) => http(l).delete(`/elemental-type/${water}`))
      }).toMatchSnapshot()
    })
  })

  describe('attendence-config', () => {
    let id: number

    it('create, list (as mobile), detail, update', async () => {
      const create = await http()
        .post('/attendence-config')
        .send({ dayOfWeek: 'MONDAY', baseCoin: 10, bonusCoin: 5 })
      id = create.body.data?.id
      if (id) created.attendance.push(id)
      expect({
        create: capture(create),
        list: capture(await http().get('/attendence-config')),
        detail: capture(await http().get(`/attendence-config/${id}`)),
        update: capture(
          await http().put(`/attendence-config/${id}`).send({ bonusCoin: 7 })
        )
      }).toMatchSnapshot()
    })

    it('list in a language that has no Languages row (ja)', async () => {
      // Used to be 404 for every route (getLand looked the language up)
      expect(capture(await http('ja').get('/attendence-config'))).toMatchSnapshot()
    })

    it('errors: duplicate day, not found, invalid body, invalid id; delete, then again', async () => {
      expect({
        duplicate: await both((l) =>
          http(l)
            .post('/attendence-config')
            .send({ dayOfWeek: 'MONDAY', baseCoin: 1, bonusCoin: 1 })
        ),
        notFound: await both((l) => http(l).get('/attendence-config/999999')),
        invalidBody: await both((l) =>
          http(l).post('/attendence-config').send({ dayOfWeek: 'FUNDAY', baseCoin: -1 })
        ),
        invalidId: await both((l) => http(l).get('/attendence-config/abc')),
        delete: capture(await http().delete(`/attendence-config/${id}`)),
        deleteAgain: await both((l) => http(l).delete(`/attendence-config/${id}`))
      }).toMatchSnapshot()
    })
  })
})
