import { AppModule } from '@/app.module'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// 422 field messages must follow each request's own Accept-Language, also when
// requests overlap. The access-token guard awaits the database between the
// middleware and the validation pipe, which is where a shared "current
// request" used to be overwritten by the next request.
describe('Validation messages per request language (e2e)', () => {
  let app: INestApplication<App>
  let token: string
  const LANGS = ['vi', 'en', 'ja'] as const

  // POST /level with an empty body: guarded route, every field invalid
  const invalidLevel = (lang: string) =>
    request(app.getHttpServer())
      .post('/level')
      .set('User-Agent', TEST_USER_AGENT)
      .set('Accept-Language', lang)
      .auth(token, { type: 'bearer' })
      .send({})

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    token = await loginAsTestAdmin(app, [{ method: 'POST', path: '/level' }])
  })

  afterAll(async () => {
    await app?.close()
  })

  it('translates field errors into the language of each overlapping request', async () => {
    // Expected bodies, one request at a time
    const expected: Record<string, unknown> = {}
    for (const lang of LANGS) {
      const res = await invalidLevel(lang)
      expect(res.status).toBe(422)
      expected[lang] = { message: res.body.message, errors: res.body.errors }
    }
    // The languages really differ, otherwise the test proves nothing
    expect(expected.vi).not.toEqual(expected.en)
    expect(expected.en).not.toEqual(expected.ja)

    const langs = Array.from({ length: 30 }, (_, i) => LANGS[i % LANGS.length])
    const responses = await Promise.all(langs.map((lang) => invalidLevel(lang)))

    responses.forEach((res, i) => {
      expect({
        lang: langs[i],
        message: res.body.message,
        errors: res.body.errors
      }).toEqual({
        lang: langs[i],
        ...(expected[langs[i]] as object)
      })
    })
  })
})
