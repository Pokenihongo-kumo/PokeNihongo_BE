import {
  FileStorage,
  PutFileInput
} from '@/infrastructure/integrations/storage/file-storage.port'
import { UploadService } from './upload.service'

// Integration-ports plan I3: the upload variants share one storing path. These
// pin what each one hands to storage (folder, resource kind, timeout, tags),
// the answer it gives and its errors, as they were with Cloudinary inline.
describe('UploadService on the FileStorage port', () => {
  const file = (mimetype: string, buffer = Buffer.from('data')) =>
    ({ originalname: 'f.bin', mimetype, buffer }) as Express.Multer.File

  function setup(
    put?: (input: PutFileInput) => Promise<{ url: string; publicId: string }>
  ) {
    const calls: PutFileInput[] = []
    const storage = {
      put: jest.fn(async (input: PutFileInput) => {
        calls.push(input)
        return put ? put(input) : { url: 'https://files/x.bin', publicId: 'id-x' }
      }),
      delete: jest.fn(async () => undefined),
      publicIdFromUrl: jest.fn(() => 'id-x'),
      presign: jest.fn(() => ({ uploadUrl: 'u', fileUrl: 'f', signature: 's' }))
    }
    const service = new UploadService(storage as unknown as FileStorage)
    // no real image decoding in a unit test
    jest.spyOn(service, 'resizeImage').mockImplementation(async (f) => f.buffer)
    return { service, storage, calls }
  }
  const options = ({ folder, resourceType, timeoutMs, tags }: PutFileInput) => ({
    folder,
    resourceType,
    timeoutMs,
    tags
  })

  it('uploadFile: image/audio/other kinds, 60s, the same answer', async () => {
    const { service, calls } = setup()
    await expect(service.uploadFile(file('image/png'), 'avatars')).resolves.toEqual({
      message: 'Upload thành công!',
      url: 'https://files/x.bin',
      publicId: 'id-x'
    })
    await service.uploadFile(file('audio/mpeg'))
    await service.uploadFile(file('application/pdf'))
    expect(calls.map(options)).toEqual([
      { folder: 'avatars', resourceType: 'image', timeoutMs: 60000, tags: undefined },
      { folder: 'uploads', resourceType: 'video', timeoutMs: 60000, tags: undefined },
      { folder: 'uploads', resourceType: 'raw', timeoutMs: 60000, tags: undefined }
    ])
  })

  it('uploadFile: a storage failure is "Upload failed!"', async () => {
    const { service } = setup(async () => Promise.reject(new Error('provider down')))
    await expect(service.uploadFile(file('image/png'))).rejects.toThrow('Upload failed!')
  })

  it('uploadFileByType: folder by kind, tags, longer timeouts for audio/video', async () => {
    const { service, calls } = setup()
    const res = await service.uploadFileByType(file('video/mp4'), 'pokemon')
    await service.uploadFileByType(file('audio/mpeg'), 'pokemon')
    await service.uploadFileByType(file('text/csv'), 'pokemon')
    await service.uploadFileByType(file('image/png'), 'pokemon', 'cover')
    expect(res.message).toBe('Upload videos file thành công!')
    expect(calls.map(options)).toEqual([
      {
        folder: 'pokemon/videos',
        resourceType: 'video',
        timeoutMs: 180000,
        tags: ['videos', 'pokemon']
      },
      {
        folder: 'pokemon/audio',
        resourceType: 'video',
        timeoutMs: 120000,
        tags: ['audio', 'pokemon']
      },
      {
        folder: 'pokemon/documents',
        resourceType: 'raw',
        timeoutMs: 60000,
        tags: ['documents', 'pokemon']
      },
      {
        folder: 'pokemon/cover',
        resourceType: 'image',
        timeoutMs: 60000,
        tags: ['cover', 'pokemon']
      }
    ])
    const failing = setup(async () => Promise.reject(new Error('down')))
    await expect(failing.service.uploadFileByType(file('text/csv'))).rejects.toThrow(
      'Upload failed for documents file!'
    )
  })

  it('vocabulary image/audio: their folders, the old file deleted first, kind checks', async () => {
    const { service, storage, calls } = setup()
    await expect(
      service.uploadVocabularyImage(file('image/png'), 'old-img')
    ).resolves.toBe('https://files/x.bin')
    await service.uploadVocabularyAudio(file('audio/mpeg'), 'old-audio')
    expect(calls.map(options)).toEqual([
      {
        folder: 'vocabulary/images',
        resourceType: 'image',
        timeoutMs: 60000,
        tags: undefined
      },
      {
        folder: 'vocabulary/audio',
        resourceType: 'video',
        timeoutMs: 120000,
        tags: undefined
      }
    ])
    expect(storage.delete.mock.calls).toEqual([['old-img'], ['old-audio']])

    await expect(service.uploadVocabularyImage(file('audio/mpeg'))).rejects.toThrow(
      'File must be an image'
    )
    await expect(service.uploadVocabularyAudio(file('image/png'))).rejects.toThrow(
      'File must be an audio file'
    )
    await expect(
      service.uploadVocabularyImage(file('image/png', Buffer.alloc(0)))
    ).rejects.toThrow('Original file buffer is empty for f.bin')
  })

  it('a failed delete of the old file does not stop the upload', async () => {
    const { service, storage } = setup()
    storage.delete.mockRejectedValueOnce(new Error('Invalid URL format'))
    await expect(service.uploadVocabularyAudio(file('audio/mpeg'), 'bad')).resolves.toBe(
      'https://files/x.bin'
    )
  })
})
