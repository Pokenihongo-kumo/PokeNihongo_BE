import { AppModule } from '@/app.module'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'

// Smoke test: the whole AppModule boots against the isolated test
// Postgres/Redis (see test/setup-e2e.ts), answers HTTP, and shuts down cleanly.
describe('App smoke (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    // Same as main.ts; API_PREFIX is empty in .env.test.example
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
  })

  afterAll(async () => {
    await app?.close()
  })

  it('returns 404 for an unknown route', async () => {
    const res = await request(app.getHttpServer()).get('/__route-that-does-not-exist__')
    expect(res.status).toBe(404)
  })

  it('rejects a protected route without a bearer token', async () => {
    const res = await request(app.getHttpServer()).get('/languages')
    expect(res.status).toBe(401)
  })
})
