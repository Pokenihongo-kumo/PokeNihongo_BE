import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
import { UploadApiResponse } from 'cloudinary'
import sharp from 'sharp'
import { GenerateUploadUrlBodyType } from './dto/upload-presigned.dto'

export interface UploadResult {
  message: string
  url: string
  publicId?: string
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name)

  constructor(@Inject('Cloudinary') private cloudinary) {}

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

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads'
  ): Promise<UploadResult> {
    const startTime = Date.now()
    this.logger.log(`Starting upload for file: ${file.originalname} to folder: ${folder}`)

    try {
      let uploadBuffer = file.buffer
      let resourceType: 'image' | 'video' | 'raw' = 'raw'

      // Xử lý hình ảnh
      if (this.isImageFile(file.mimetype)) {
        try {
          uploadBuffer = await this.resizeImage(file)
        } catch (error) {
          this.logger.warn(`Failed to resize image, using original: ${error.message}`)
          uploadBuffer = file.buffer // Fallback to original buffer
        }
        resourceType = 'image'
      }
      // Xử lý audio
      else if (this.isAudioFile(file.mimetype)) {
        resourceType = 'video' // Cloudinary treats audio as video resource type
      }

      return new Promise((resolve, reject) => {
        const uploadStream = this.cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: resourceType,
            timeout: 60000,
            use_filename: true,
            unique_filename: true
          },
          (error, result: UploadApiResponse) => {
            if (error) {
              this.logger.error(
                `Upload failed for ${file.originalname}: ${error.message}`
              )
              return reject(new Error('Upload failed!'))
            }
            this.logger.log(
              `Upload completed for ${file.originalname} in ${Date.now() - startTime}ms`
            )
            resolve({
              message: 'Upload thành công!',
              url: result.secure_url,
              publicId: result.public_id
            })
          }
        )

        uploadStream.end(uploadBuffer)
      })
    } catch (error) {
      this.logger.error(`Error processing file ${file.originalname}: ${error.message}`)
      throw new Error('File processing failed!')
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

    // Xác định loại file và thư mục
    const fileType = customFolder || this.getFileTypeFromMimetype(file.mimetype)
    const folder = `${baseFolder}/${fileType}`

    this.logger.log(
      `Starting auto-categorized upload for file: ${file.originalname} (${file.mimetype}) to folder: ${folder}`
    )

    try {
      let uploadBuffer = file.buffer
      let resourceType: 'image' | 'video' | 'raw' = 'raw'

      // Xử lý theo loại file
      if (this.isImageFile(file.mimetype)) {
        try {
          uploadBuffer = await this.resizeImage(file)
          this.logger.log(`Image resized successfully for ${file.originalname}`)
        } catch (error) {
          this.logger.warn(`Failed to resize image, using original: ${error.message}`)
          uploadBuffer = file.buffer
        }
        resourceType = 'image'
      } else if (this.isAudioFile(file.mimetype) || this.isVideoFile(file.mimetype)) {
        resourceType = 'video' // Cloudinary treats both audio and video as 'video'
      } else {
        // Documents và other files sử dụng 'raw'
        resourceType = 'raw'
      }

      // Thiết lập timeout dựa trên loại file
      let timeout = 60000 // Default 60s
      if (this.isVideoFile(file.mimetype)) {
        timeout = 180000 // 3 minutes for videos
      } else if (this.isAudioFile(file.mimetype)) {
        timeout = 120000 // 2 minutes for audio
      }

      return new Promise((resolve, reject) => {
        const uploadStream = this.cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: resourceType,
            timeout,
            use_filename: true,
            unique_filename: true,
            // Thêm tags để dễ quản lý
            tags: [fileType, baseFolder]
          },
          (error, result: UploadApiResponse) => {
            if (error) {
              this.logger.error(
                `Auto-categorized upload failed for ${file.originalname}: ${error.message}`
              )
              return reject(new Error(`Upload failed for ${fileType} file!`))
            }

            const uploadTime = Date.now() - startTime
            this.logger.log(
              `Auto-categorized upload completed for ${file.originalname} (${fileType}) in ${uploadTime}ms`
            )

            resolve({
              message: `Upload ${fileType} file thành công!`,
              url: result.secure_url,
              publicId: result.public_id
            })
          }
        )

        uploadStream.end(uploadBuffer)
      })
    } catch (error) {
      this.logger.error(
        `Error processing ${fileType} file ${file.originalname}: ${error.message}`
      )
      throw new Error(`File processing failed for ${fileType} file!`)
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

    let resizedBuffer: Buffer
    try {
      resizedBuffer = await this.resizeImage(file)
    } catch (error) {
      this.logger.warn(
        `Failed to resize image ${file.originalname}, using original: ${error.message}`
      )
      resizedBuffer = file.buffer // Use original buffer as fallback
    }

    // Check if buffer is valid
    if (!resizedBuffer || resizedBuffer.length === 0) {
      throw new Error('Empty file')
    }

    return new Promise((resolve, reject) => {
      const uploadNewImage = () => {
        this.cloudinary.uploader
          .upload_stream(
            {
              folder: 'vocabulary/images',
              resource_type: 'image',
              timeout: 60000,
              use_filename: true,
              unique_filename: true
            },
            (error, result: UploadApiResponse) => {
              if (error) {
                this.logger.error(
                  `Image upload failed for ${file.originalname}: ${error.message}`
                )
                return reject(error)
              }
              this.logger.log(
                `Image upload completed for ${file.originalname} in ${Date.now() - startTime}ms`
              )
              resolve(result.secure_url)
            }
          )
          .end(resizedBuffer)
      }

      if (oldImageUrl) {
        this.deleteFile(oldImageUrl, 'vocabulary/images')
          .then(() => {
            this.logger.log(`Deleted old image`)
            uploadNewImage()
          })
          .catch((error) => {
            this.logger.warn(`Failed to delete old image: ${error.message}`)
            uploadNewImage() // Continue with upload even if delete fails
          })
      } else {
        uploadNewImage()
      }
    })
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

    return new Promise((resolve, reject) => {
      const uploadNewAudio = () => {
        this.cloudinary.uploader
          .upload_stream(
            {
              folder: 'vocabulary/audio',
              resource_type: 'video', // Cloudinary treats audio as video
              timeout: 120000, // Longer timeout for audio files
              use_filename: true,
              unique_filename: true
            },
            (error, result: UploadApiResponse) => {
              if (error) {
                this.logger.error(
                  `Audio upload failed for ${file.originalname}: ${error.message}`
                )
                return reject(error)
              }
              this.logger.log(
                `Audio upload completed for ${file.originalname} in ${Date.now() - startTime}ms`
              )
              resolve(result.secure_url)
            }
          )
          .end(file.buffer)
      }

      if (oldAudioUrl) {
        this.deleteFile(oldAudioUrl, 'vocabulary/audio')
          .then(() => {
            this.logger.log(`Deleted old audio`)
            uploadNewAudio()
          })
          .catch((error) => {
            this.logger.warn(`Failed to delete old audio: ${error.message}`)
            uploadNewAudio() // Continue with upload even if delete fails
          })
      } else {
        uploadNewAudio()
      }
    })
  }

  async deleteFile(url: string, folder: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Extract public_id from URL
      const publicId = this.extractPublicIdFromUrl(url)
      if (!publicId) {
        return reject(new Error('Invalid URL format'))
      }

      this.cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          this.logger.error(`Failed to delete file ${publicId}: ${error.message}`)
          return reject(error)
        }
        this.logger.log(`Deleted file ${publicId}`)
        resolve()
      })
    })
  }

  private extractPublicIdFromUrl(url: string): string | null {
    try {
      // Extract public_id from Cloudinary URL
      // Example: https://res.cloudinary.com/cloud_name/video/upload/v1234567890/vocabulary/audio/filename.mp3
      const urlParts = url.split('/')
      const uploadIndex = urlParts.findIndex((part) => part === 'upload')
      if (uploadIndex === -1) return null

      // Get everything after 'upload/' and before the last part (filename)
      const pathParts = urlParts.slice(uploadIndex + 2, -1)
      const filename = urlParts[urlParts.length - 1]
      const nameWithoutExt = filename.split('.')[0]

      return [...pathParts, nameWithoutExt].join('/')
    } catch (error) {
      this.logger.error(`Error extracting public_id from URL: ${url}`)
      return null
    }
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

  // ========== CONVENIENCE METHODS FOR SPECIFIC FILE TYPES ==========

  /**
   * Upload image và tự động resize + đặt vào thư mục images
   */
  async uploadImageFile(
    file: Express.Multer.File,
    baseFolder: string = 'uploads'
  ): Promise<UploadResult> {
    if (!this.isImageFile(file.mimetype)) {
      throw new Error('File must be an image')
    }
    return this.uploadFileByType(file, baseFolder, 'images')
  }

  /**
   * Upload audio file và đặt vào thư mục audio
   */
  async uploadAudioFile(
    file: Express.Multer.File,
    baseFolder: string = 'uploads'
  ): Promise<UploadResult> {
    if (!this.isAudioFile(file.mimetype)) {
      throw new Error('File must be an audio file')
    }
    return this.uploadFileByType(file, baseFolder, 'audio')
  }

  /**
   * Upload video file và đặt vào thư mục videos
   */
  async uploadVideoFile(
    file: Express.Multer.File,
    baseFolder: string = 'uploads'
  ): Promise<UploadResult> {
    if (!this.isVideoFile(file.mimetype)) {
      throw new Error('File must be a video file')
    }
    return this.uploadFileByType(file, baseFolder, 'videos')
  }

  /**
   * Upload document file và đặt vào thư mục documents
   */
  async uploadDocumentFile(
    file: Express.Multer.File,
    baseFolder: string = 'uploads'
  ): Promise<UploadResult> {
    if (!this.isDocumentFile(file.mimetype)) {
      throw new Error('File must be a document')
    }
    return this.uploadFileByType(file, baseFolder, 'documents')
  }

  /**
   * Upload multiple files cùng lúc và phân loại tự động
   */
  async uploadMultipleFilesByType(
    files: Express.Multer.File[],
    baseFolder: string = 'uploads'
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadFileByType(file, baseFolder))
    return Promise.all(uploadPromises)
  }

  /**
   * Lấy thông tin loại file từ mimetype
   */
  getFileTypeInfo(mimetype: string): { type: string; category: string; folder: string } {
    const folder = this.getFileTypeFromMimetype(mimetype)
    let category = 'Unknown'

    if (this.isImageFile(mimetype)) category = 'Image'
    else if (this.isAudioFile(mimetype)) category = 'Audio'
    else if (this.isVideoFile(mimetype)) category = 'Video'
    else if (this.isDocumentFile(mimetype)) category = 'Document'
    else category = 'Other'

    return {
      type: mimetype,
      category,
      folder
    }
  }

  /**
   * Generate pre-signed upload URL for direct client upload to Cloudinary
   */
  async generateUploadUrl(data: GenerateUploadUrlBodyType) {
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
    const fileExtension = fileName.split('.').pop()
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
    const publicId = `${folderName}/${fileNameWithoutExt}_${timestamp}_${randomString}`

    // Determine resource type for Cloudinary
    let resourceType: 'image' | 'video' | 'raw' = 'raw'
    if (fileType === 'image') resourceType = 'image'
    else if (fileType === 'video' || fileType === 'audio') resourceType = 'video'

    // Generate Cloudinary signature
    const uploadParams = {
      timestamp,
      public_id: publicId,
      folder: folderName,
      resource_type: resourceType,
      // Add format transformation for images
      ...(fileType === 'image' && { format: 'auto', quality: 'auto:good' })
    }

    const signature = this.cloudinary.utils.api_sign_request(
      uploadParams,
      this.cloudinary.config().api_secret
    )

    // Construct upload URL
    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudinary.config().cloud_name}/${resourceType}/upload`

    // Construct final file URL (what will be the URL after upload)
    const fileUrl = this.cloudinary.url(publicId, {
      resource_type: resourceType,
      secure: true,
      ...(fileType === 'image' && { format: 'auto', quality: 'auto:good' })
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
