import { CloudinaryModule } from '@/modules/upload/cloudinary/cloudinary.module'
import envConfig from '@/config/env.config'
import { Module } from '@nestjs/common'
import { CloudinaryFileStorage } from './cloudinary-file-storage.adapter'
import { FileStorage } from './file-storage.port'
import { LocalFileStorage } from './local-file-storage.adapter'

const cloudinary = envConfig.STORAGE_DRIVER === 'cloudinary'

// Provides the FileStorage port; with STORAGE_DRIVER=local the Cloudinary
// client is not created at all
@Module({
  imports: cloudinary ? [CloudinaryModule] : [],
  providers: [
    {
      provide: FileStorage,
      useClass: cloudinary ? CloudinaryFileStorage : LocalFileStorage
    }
  ],
  exports: [FileStorage]
})
export class FileStorageModule {}
