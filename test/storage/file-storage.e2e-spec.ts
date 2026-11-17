import { AppModule } from '@/app.module'
import { UploadService } from '@/3rdService/upload/upload.service'
import { FileStorage } from '@/infrastructure/integrations/storage/file-storage.port'
import {
  LocalFileStorage,
  localStorageDir
} from '@/infrastructure/integrations/storage/local-file-storage.adapter'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { existsSync } from 'fs'
import { join } from 'path'
import { App } from 'supertest/types'

// Integration-ports plan I3: with STORAGE_DRIVER=local (.env.test) the app
// boots without Cloudinary; files go to a local folder and can be deleted
describe('File storage driver (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app?.close()
  })

  it('STORAGE_DRIVER=local: upload, then delete, on this machine', async () => {
    expect(app.get(FileStorage, { strict: false })).toBeInstanceOf(LocalFileStorage)
    const upload = app.get(UploadService, { strict: false })
    const res = await upload.uploadFile(
      {
        originalname: 'note.txt',
        mimetype: 'text/plain',
        buffer: Buffer.from('hi')
      } as Express.Multer.File,
      'e2e-storage'
    )
    expect(res.url).toContain('/local-files/e2e-storage/')
    const path = join(localStorageDir(), res.publicId as string)
    expect(existsSync(path)).toBe(true)
    expect(upload.publicIdFromUrl(res.url)).toBe(res.publicId)

    await upload.deleteFile(res.url, 'e2e-storage')
    expect(existsSync(path)).toBe(false)
  })

  it('a URL outside the storage folder is refused', async () => {
    const upload = app.get(UploadService, { strict: false })
    await expect(upload.deleteFile('https://example.test/x.png', 'x')).rejects.toThrow(
      'Invalid URL format'
    )
    await expect(
      upload.deleteFile('http://localhost/local-files/../../etc/passwd', 'x')
    ).rejects.toThrow('Invalid URL format')
  })
})
