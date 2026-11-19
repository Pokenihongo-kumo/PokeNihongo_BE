import { AppModule } from '@/app.module'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { responseShape } from '../support/response-shape'
import { loginAsTestAdmin, TEST_ADMIN, TEST_USER_AGENT } from '../support/test-admin'

// Phase 0 baseline of the HTTP response contract as it is today, before any
// response unification. Covers both coding styles (A: level, i18n messages;
// B: languages, constant messages) plus the global pipeline (auth guard,
// validation pipe, unknown route). Snapshots record what web/mobile receive;
// a later intentional contract change must update them in the same commit.
describe('Response contract baseline (e2e)', () => {
  let app: INestApplication<App>
  let token: string
  // Real clients always send a User-Agent
  const http = () => request.agent(app.getHttpServer()).set('User-Agent', TEST_USER_AGENT)

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    token = await loginAsTestAdmin(app, [
      { method: 'GET', path: '/languages' },
      { method: 'GET', path: '/languages/:id' },
      { method: 'POST', path: '/languages' },
      { method: 'POST', path: '/level' }
    ])
  })

  afterAll(async () => {
    await app?.close()
  })

  const capture = (res: request.Response) => ({
    httpStatus: res.status,
    body: responseShape(res.body)
  })

  describe('success', () => {
    it('login (public, auth module)', async () => {
      const res = await http().post('/auth/login').send(TEST_ADMIN)
      expect(capture(res)).toMatchSnapshot()
    })

    it('login without a User-Agent header', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send(TEST_ADMIN)
      expect(capture(res)).toMatchSnapshot()
    })

    it('check-email for a known device (no OTP)', async () => {
      const res = await http().get(`/auth/check-email/${TEST_ADMIN.email}`)
      expect(capture(res)).toMatchSnapshot()
    })

    it('list, style A (GET /level, public)', async () => {
      const res = await http().get('/level')
      expect(capture(res)).toMatchSnapshot()
    })

    it('list, style B (GET /languages)', async () => {
      const res = await http().get('/languages').auth(token, { type: 'bearer' })
      expect(capture(res)).toMatchSnapshot()
    })
  })

  describe('errors', () => {
    it('unknown route', async () => {
      const res = await http().get('/__route-that-does-not-exist__')
      expect(capture(res)).toMatchSnapshot()
    })

    it('missing bearer token', async () => {
      const res = await http().get('/languages')
      expect(capture(res)).toMatchSnapshot()
    })

    it('wrong password', async () => {
      const res = await http()
        .post('/auth/login')
        .send({ ...TEST_ADMIN, password: 'wrong-password' })
      expect(capture(res)).toMatchSnapshot()
    })

    it('not found, style A (GET /level/999999), vi and en', async () => {
      const vi = await http().get('/level/999999').set('Accept-Language', 'vi')
      const en = await http().get('/level/999999').set('Accept-Language', 'en')
      expect({ vi: capture(vi), en: capture(en) }).toMatchSnapshot()
    })

    it('not found, style B (GET /languages/999999), vi and en', async () => {
      const vi = await http()
        .get('/languages/999999')
        .auth(token, { type: 'bearer' })
        .set('Accept-Language', 'vi')
      const en = await http()
        .get('/languages/999999')
        .auth(token, { type: 'bearer' })
        .set('Accept-Language', 'en')
      expect({ vi: capture(vi), en: capture(en) }).toMatchSnapshot()
    })

    it('validation, style A (POST /level with empty body)', async () => {
      const res = await http().post('/level').auth(token, { type: 'bearer' }).send({})
      expect(capture(res)).toMatchSnapshot()
    })

    it('validation, style B (POST /languages with empty body)', async () => {
      const res = await http().post('/languages').auth(token, { type: 'bearer' }).send({})
      expect(capture(res)).toMatchSnapshot()
    })
  })
})
