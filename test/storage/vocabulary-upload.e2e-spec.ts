import { AppModule } from '@/app.module'
import { INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { loginAsTestAdmin, TEST_USER_AGENT } from '../support/test-admin'

// POST /upload/vocabulary/image and /audio used multer-storage-cloudinary: the
// file was uploaded while the request was parsed (no buffer left), then
// UploadService refused the empty buffer, so these routes never worked and
// left an orphan file at the provider. They now read the file in memory and
// store it once through UploadService. STORAGE_DRIVER=local here.
describe('Vocabulary upload routes (e2e)', () => {
  let app: INestApplication<App>
  let token: string
  // a 1x1 PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  )

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.enableVersioning({ type: VersioningType.URI })
    await app.init()
    token = await loginAsTestAdmin(app, [
      { method: 'POST', path: '/upload/vocabulary/image' },
      { method: 'POST', path: '/upload/vocabulary/audio' }
    ])
  })

  afterAll(async () => {
    await app?.close()
  })

  it('an image is stored in vocabulary/images', async () => {
    const res = await request(app.getHttpServer())
      .post('/upload/vocabulary/image')
      .set('User-Agent', TEST_USER_AGENT)
      .auth(token, { type: 'bearer' })
      .attach('image', png, { filename: 'cat.png', contentType: 'image/png' })
    expect(res.status).toBe(201)
    expect(res.body.data.url).toContain('/local-files/vocabulary/images/')
  })

  it('an audio file is stored in vocabulary/audio', async () => {
    const res = await request(app.getHttpServer())
      .post('/upload/vocabulary/audio')
      .set('User-Agent', TEST_USER_AGENT)
      .auth(token, { type: 'bearer' })
      .attach('audio', Buffer.from('ID3fake'), {
        filename: 'neko.mp3',
        contentType: 'audio/mpeg'
      })
    expect(res.status).toBe(201)
    expect(res.body.data.url).toContain('/local-files/vocabulary/audio/')
  })

  it('the wrong kind of file is still refused', async () => {
    const res = await request(app.getHttpServer())
      .post('/upload/vocabulary/audio')
      .set('User-Agent', TEST_USER_AGENT)
      .auth(token, { type: 'bearer' })
      .attach('audio', png, { filename: 'cat.png', contentType: 'image/png' })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })
})
