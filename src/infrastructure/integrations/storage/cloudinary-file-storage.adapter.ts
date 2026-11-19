import { Inject, Injectable, Logger } from '@nestjs/common'
import { UploadApiResponse } from 'cloudinary'
import {
  FileStorage,
  PresignedUpload,
  PresignInput,
  PutFileInput,
  StoredFile
} from './file-storage.port'

// STORAGE_DRIVER=cloudinary: the provider, with the options UploadService used
@Injectable()
export class CloudinaryFileStorage extends FileStorage {
  private readonly logger = new Logger(CloudinaryFileStorage.name)

  constructor(@Inject('Cloudinary') private readonly cloudinary) {
    super()
  }

  put({
    buffer,
    folder,
    resourceType,
    timeoutMs,
    tags
  }: PutFileInput): Promise<StoredFile> {
    return new Promise((resolve, reject) => {
      this.cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: resourceType,
            timeout: timeoutMs,
            use_filename: true,
            unique_filename: true,
            ...(tags ? { tags } : {})
          },
          (error, result: UploadApiResponse) => {
            if (error) return reject(error)
            resolve({ url: result.secure_url, publicId: result.public_id })
          }
        )
        .end(buffer)
    })
  }

  delete(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const publicId = this.publicIdFromUrl(url)
      if (!publicId) {
        return reject(new Error('Invalid URL format'))
      }
      this.cloudinary.uploader.destroy(publicId, (error) => {
        if (error) {
          this.logger.error(`Failed to delete file ${publicId}: ${error.message}`)
          return reject(error)
        }
        this.logger.log(`Deleted file ${publicId}`)
        resolve()
      })
    })
  }

  // https://res.cloudinary.com/<cloud>/video/upload/v123/vocabulary/audio/name.mp3
  // -> vocabulary/audio/name
  publicIdFromUrl(url: string): string | null {
    try {
      const urlParts = url.split('/')
      const uploadIndex = urlParts.findIndex((part) => part === 'upload')
      if (uploadIndex === -1) return null
      const pathParts = urlParts.slice(uploadIndex + 2, -1)
      const filename = urlParts[urlParts.length - 1]
      const nameWithoutExt = filename.split('.')[0]
      return [...pathParts, nameWithoutExt].join('/')
    } catch {
      this.logger.error(`Error extracting public_id from URL: ${url}`)
      return null
    }
  }

  presign({
    publicId,
    folder,
    resourceType,
    image,
    timestamp
  }: PresignInput): PresignedUpload {
    const imageOptions = image ? { format: 'auto', quality: 'auto:good' } : {}
    const signature = this.cloudinary.utils.api_sign_request(
      {
        timestamp,
        public_id: publicId,
        folder,
        resource_type: resourceType,
        ...imageOptions
      },
      this.cloudinary.config().api_secret
    )
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudinary.config().cloud_name}/${resourceType}/upload`,
      fileUrl: this.cloudinary.url(publicId, {
        resource_type: resourceType,
        secure: true,
        ...imageOptions
      }),
      signature
    }
  }
}
