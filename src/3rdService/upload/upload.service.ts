import {
  FileStorage,
  StoredFile,
  StoredResourceType
} from '@/infrastructure/integrations/storage/file-storage.port'
import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import sharp from 'sharp'
import { GenerateUploadUrlBody } from './dto/upload-presigned.dto'

export interface UploadResult {
  message: string
  url: string
  publicId?: string
}

// Upload rules (which files, which folder, resize, timeouts, messages); the
// file itself goes to the FileStorage port (integration-ports plan I3)
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name)

  constructor(private readonly fileStorage: FileStorage) {}

  private isImageFile(mimetype: string): boolean {
    return mimetype.startsWith('image/')
  }

  private isAudioFile(mimetype: string): boolean {
    return mimetype.startsWith('audio/')
  }

  private isVideoFile(mimetype: string): boolean {
    return mimetype.startsWith('video/')
  }

  private isDocumentFile(mimetype: string): boolean {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ]
    return documentTypes.includes(mimetype)
  }

  private getFileTypeFromMimetype(mimetype: string): string {
    if (this.isImageFile(mimetype)) {
      return 'images'
    }
    if (this.isAudioFile(mimetype)) {
      return 'audio'
    }
    if (this.isVideoFile(mimetype)) {
      return 'videos'
    }
    if (this.isDocumentFile(mimetype)) {
      return 'documents'
    }
    return 'others'
  }

  async resizeImage(file: Express.Multer.File): Promise<Buffer> {
    try {
      // Validate file buffer
      if (!file.buffer || file.buffer.length === 0) {
        this.logger.warn(`File buffer is empty for ${file.originalname}, skipping resize`)
        return file.buffer
      }

      // Check if it's a valid image format
      const supportedFormats = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp'
      ]
      if (!supportedFormats.includes(file.mimetype)) {
        this.logger.warn(`Unsupported image format: ${file.mimetype}, skipping resize`)
        return file.buffer
      }

      this.logger.log(
        `Resizing image: ${file.originalname}, size: ${file.buffer.length} bytes, mimetype: ${file.mimetype}`
      )

      return await sharp(file.buffer)
        .resize({ width: 800, height: 800, fit: 'inside' }) // Resize về 800x800, giữ tỷ lệ
        .toBuffer()
    } catch (error) {
      this.logger.warn(
        `Error resizing image ${file.originalname}, using original: ${error.message}`
      )
      return file.buffer // Return original buffer if resize fails
    }
  }

  // One storing path for every upload variant below: resize images when asked,
  // then hand the buffer to the storage port
  private async store(
    file: Express.Multer.File,
    options: {
      folder: string
      resourceType: StoredResourceType
      timeoutMs: number
      resize: boolean
      tags?: string[]
      buffer?: Buffer
    }
  ): Promise<StoredFile> {
    let buffer = options.buffer ?? file.buffer
    if (options.resize) {
      try {
        buffer = await this.resizeImage(file)
      } catch (error) {
        this.logger.warn(`Failed to resize image, using original: ${error.message}`)
        buffer = file.buffer
      }
    }
    return this.fileStorage.put({
      buffer,
      folder: options.folder,
      resourceType: options.resourceType,
      timeoutMs: options.timeoutMs,
      tags: options.tags,
      originalName: file.originalname
    })
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads'
  ): Promise<UploadResult> {
    const startTime = Date.now()
    this.logger.log(`Starting upload for file: ${file.originalname} to folder: ${folder}`)
    let image: boolean
    let resourceType: StoredResourceType
    try {
      image = this.isImageFile(file.mimetype)
      // Cloudinary treats audio as video resource type
      resourceType = image ? 'image' : this.isAudioFile(file.mimetype) ? 'video' : 'raw'
    } catch (error) {
      this.logger.error(`Error processing file ${file.originalname}: ${error.message}`)
      throw new Error('File processing failed!')
    }
    try {
      const stored = await this.store(file, {
        folder,
        resourceType,
        timeoutMs: 60000,
        resize: image
      })
      this.logger.log(
        `Upload completed for ${file.originalname} in ${Date.now() - startTime}ms`
      )
      return { message: 'Upload thành công!', url: stored.url, publicId: stored.publicId }
    } catch (error) {
      this.logger.error(`Upload failed for ${file.originalname}: ${error.message}`)
      throw new Error('Upload failed!')
    }
  }

  /**
   * Upload file và tự động phân loại vào thư mục theo loại file
   * @param file File cần upload
   * @param baseFolder Thư mục gốc (mặc định: 'uploads')
   * @param customFolder Thư mục tùy chọn thay vì phân loại tự động
   * @returns UploadResult với thông tin file đã upload
   */
  async uploadFileByType(
    file: Express.Multer.File,
    baseFolder: string = 'uploads',
    customFolder?: string
  ): Promise<UploadResult> {
    const startTime = Date.now()
    const fileType = customFolder || this.getFileTypeFromMimetype(file.mimetype)
    const folder = `${baseFolder}/${fileType}`
    this.logger.log(
      `Starting auto-categorized upload for file: ${file.originalname} (${file.mimetype}) to folder: ${folder}`
    )
    const image = this.isImageFile(file.mimetype)
    const audio = this.isAudioFile(file.mimetype)
    const video = this.isVideoFile(file.mimetype)
    try {
      const stored = await this.store(file, {
        folder,
        // Cloudinary treats both audio and video as 'video'; documents are 'raw'
        resourceType: image ? 'image' : audio || video ? 'video' : 'raw',
        timeoutMs: video ? 180000 : audio ? 120000 : 60000,
        resize: image,
        tags: [fileType, baseFolder]
      })
      this.logger.log(
        `Auto-categorized upload completed for ${file.originalname} (${fileType}) in ${Date.now() - startTime}ms`
      )
      return {
        message: `Upload ${fileType} file thành công!`,
        url: stored.url,
        publicId: stored.publicId
      }
    } catch (error) {
      this.logger.error(
        `Auto-categorized upload failed for ${file.originalname}: ${error.message}`
      )
      throw new Error(`Upload failed for ${fileType} file!`)
    }
  }

  // The old file is deleted first; a failed delete does not stop the upload
  private async replaceOld(oldUrl: string | undefined, folder: string, what: string) {
    if (!oldUrl) return
    try {
      await this.deleteFile(oldUrl, folder)
      this.logger.log(`Deleted old ${what}`)
    } catch (error) {
      this.logger.warn(`Failed to delete old ${what}: ${error.message}`)
    }
  }

  async uploadVocabularyImage(
    file: Express.Multer.File,
    oldImageUrl?: string
  ): Promise<string> {
    const startTime = Date.now()
    this.logger.log(`Starting vocabulary image upload for file: ${file.originalname}`)

    if (!this.isImageFile(file.mimetype)) {
      throw new Error('File must be an image')
    }
    // Check if original file buffer is valid first
    if (!file.buffer || file.buffer.length === 0) {
      throw new Error(`Original file buffer is empty for ${file.originalname}`)
    }
    const resizedBuffer = await this.resizeImage(file)
    if (!resizedBuffer || resizedBuffer.length === 0) {
      throw new Error('Empty file')
    }

    await this.replaceOld(oldImageUrl, 'vocabulary/images', 'image')
    try {
      const stored = await this.store(file, {
        folder: 'vocabulary/images',
        resourceType: 'image',
        timeoutMs: 60000,
        resize: false,
        buffer: resizedBuffer
      })
      this.logger.log(
        `Image upload completed for ${file.originalname} in ${Date.now() - startTime}ms`
      )
      return stored.url
    } catch (error) {
      this.logger.error(`Image upload failed for ${file.originalname}: ${error.message}`)
      throw error
    }
  }

  async uploadVocabularyAudio(
    file: Express.Multer.File,
    oldAudioUrl?: string
  ): Promise<string> {
    const startTime = Date.now()
    this.logger.log(`Starting vocabulary audio upload for file: ${file.originalname}`)

    if (!this.isAudioFile(file.mimetype)) {
      throw new Error('File must be an audio file')
    }

    await this.replaceOld(oldAudioUrl, 'vocabulary/audio', 'audio')
    try {
      const stored = await this.store(file, {
        folder: 'vocabulary/audio',
        resourceType: 'video', // Cloudinary treats audio as video
        timeoutMs: 120000, // Longer timeout for audio files
        resize: false
      })
      this.logger.log(
        `Audio upload completed for ${file.originalname} in ${Date.now() - startTime}ms`
      )
      return stored.url
    } catch (error) {
      this.logger.error(`Audio upload failed for ${file.originalname}: ${error.message}`)
      throw error
    }
  }

  // folder: kept for callers; the URL says where the file is
  async deleteFile(url: string, folder: string): Promise<void> {
    void folder
    return this.fileStorage.delete(url)
  }

  // The storage id inside a stored file's URL (null when it is not one of ours)
  publicIdFromUrl(url: string): string | null {
    return this.fileStorage.publicIdFromUrl(url)
  }

  async uploadVocabularyFiles(
    imageFile?: Express.Multer.File,
    audioFile?: Express.Multer.File,
    oldImageUrl?: string,
    oldAudioUrl?: string
  ): Promise<{ imageUrl?: string; audioUrl?: string }> {
    const results: { imageUrl?: string; audioUrl?: string } = {}

    try {
      // Upload image if provided
      if (imageFile) {
        results.imageUrl = await this.uploadVocabularyImage(imageFile, oldImageUrl)
      }

      // Upload audio if provided
      if (audioFile) {
        results.audioUrl = await this.uploadVocabularyAudio(audioFile, oldAudioUrl)
      }

      return results
    } catch (error) {
      this.logger.error('Error uploading vocabulary files:', error)
      throw new Error('Upload files thất bại')
    }
  }

  /**
   * Generate pre-signed upload URL for direct client upload to Cloudinary
   */
  async generateUploadUrl(data: GenerateUploadUrlBody) {
    const { fileName, fileType, folderName, mimeType, fileSize } = data

    // Validate file type matches MIME type
    const typeValidation = {
      image: (mime: string) => mime.startsWith('image/'),
      audio: (mime: string) => mime.startsWith('audio/'),
      video: (mime: string) => mime.startsWith('video/'),
      document: (mime: string) => {
        const documentTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv'
        ]
        return documentTypes.includes(mime)
      }
    }

    if (!typeValidation[fileType]?.(mimeType)) {
      const typeMessages = {
        image: 'hình ảnh (JPEG, PNG, WEBP, GIF)',
        audio: 'âm thanh (MP3, WAV, OGG)',
        video: 'video (MP4, AVI, MOV)',
        document: 'tài liệu (PDF, DOC, DOCX, XLS, XLSX, TXT, CSV)'
      }
      throw new BadRequestException(
        `File type "${fileType}" không khớp với MIME type "${mimeType}". Chỉ chấp nhận ${typeMessages[fileType]}`
      )
    }

    // Validate file size based on type
    const fileSizeLimits = {
      image: 5 * 1024 * 1024, // 5MB
      audio: 10 * 1024 * 1024, // 10MB
      video: 50 * 1024 * 1024, // 50MB
      document: 5 * 1024 * 1024 // 5MB
    }

    const maxSize = fileSizeLimits[fileType]
    if (fileSize > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024))
      throw new BadRequestException(`File ${fileType} không được vượt quá ${maxSizeMB}MB`)
    }

    // Generate unique public ID
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
    const publicId = `${folderName}/${fileNameWithoutExt}_${timestamp}_${randomString}`

    // Determine resource type for Cloudinary
    let resourceType: StoredResourceType = 'raw'
    if (fileType === 'image') resourceType = 'image'
    else if (fileType === 'video' || fileType === 'audio') resourceType = 'video'

    // The signature is computed but, as before, not returned (recorded in the
    // tracker: a direct upload cannot use this answer yet)
    const { uploadUrl, fileUrl } = this.fileStorage.presign({
      publicId,
      folder: folderName,
      resourceType,
      image: fileType === 'image',
      timestamp
    })

    // Set expiration time (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    return {
      uploadUrl,
      fileUrl,
      publicId,
      expiresAt
    }
  }
}
