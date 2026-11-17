import { memoryStorage } from 'multer'
// All configs keep the file in memory: UploadService stores it once, through
// the FileStorage port. The two vocabulary configs used multer-storage-
// cloudinary, which uploaded during parsing and left no buffer for the
// service, so those routes always failed (and left an orphan file).

// Multer config cho hình ảnh
export const CloudinaryImageMulterConfig = {
  storage: memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh'), false)
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
}

// Multer config cho audio
export const CloudinaryAudioMulterConfig = {
  storage: memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận file âm thanh'), false)
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
}

// Multer config chung cho multiple files - sử dụng memory storage để xử lý
export const CloudinaryMultiMulterConfig = {
  storage: memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh hoặc âm thanh'), false)
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 2 // Tối đa 2 files
  }
}

// Multer config cho upload image với folder tùy chọn - giới hạn 3MB
export const CloudinaryImageUploadConfig = {
  storage: memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Kiểm tra mimetype
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh (JPEG, PNG, WEBP, GIF)'), false)
    }
  },
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB
    files: 1 // Chỉ cho phép 1 file
  }
}

// Multer config linh hoạt cho tất cả các loại file - chỉ check basic validation
export const CloudinaryFlexibleUploadConfig = {
  storage: memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Chấp nhận tất cả các loại file phổ biến, sẽ validate chi tiết trong controller
    const allowedMimeTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      // Audio
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
      'audio/x-m4a',
      // Video
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ]

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`File type ${file.mimetype} không được hỗ trợ`), false)
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB - sẽ validate chi tiết trong controller
    files: 1
  }
}
