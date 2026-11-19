import envConfig from '@/config/env.config'
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { extname, join, normalize, sep } from 'path'
import {
  FileStorage,
  PresignedUpload,
  PresignInput,
  PutFileInput,
  StoredFile
} from './file-storage.port'

export const LOCAL_FILES_PREFIX = '/local-files/'

// Where STORAGE_DRIVER=local keeps files (served by main.ts under /local-files/)
export const localStorageDir = () =>
  envConfig.LOCAL_STORAGE_DIR || join(tmpdir(), 'pokenihongo-files')

const baseUrl = () =>
  (envConfig.APP_URL || `http://localhost:${envConfig.APP_PORT}`).replace(/\/$/, '')

// STORAGE_DRIVER=local: files on this machine, no provider or key. Tests and
// local demo only; the config refuses it in production.
@Injectable()
export class LocalFileStorage extends FileStorage {
  private readonly logger = new Logger(LocalFileStorage.name)

  async put({ buffer, folder, originalName }: PutFileInput): Promise<StoredFile> {
    const name = `${randomUUID()}${originalName ? extname(originalName) : ''}`
    const publicId = `${folder}/${name}`
    const path = this.pathOf(publicId)
    await fs.mkdir(join(path, '..'), { recursive: true })
    await fs.writeFile(path, buffer)
    this.logger.log(`Stored locally: ${publicId}`)
    return { url: `${baseUrl()}${LOCAL_FILES_PREFIX}${publicId}`, publicId }
  }

  async delete(url: string): Promise<void> {
    const publicId = this.publicIdFromUrl(url)
    if (!publicId) throw new Error('Invalid URL format')
    await fs.rm(this.pathOf(publicId), { force: true })
  }

  publicIdFromUrl(url: string): string | null {
    const index = url.indexOf(LOCAL_FILES_PREFIX)
    return index === -1 ? null : url.slice(index + LOCAL_FILES_PREFIX.length) || null
  }

  presign(input: PresignInput): PresignedUpload {
    void input
    throw new ServiceUnavailableException(
      'Presigned upload needs STORAGE_DRIVER=cloudinary'
    )
  }

  // inside the storage folder only (no ../ out of it)
  private pathOf(publicId: string): string {
    const root = normalize(localStorageDir())
    const path = normalize(join(root, publicId))
    if (!path.startsWith(root + sep)) throw new Error('Invalid URL format')
    return path
  }
}
