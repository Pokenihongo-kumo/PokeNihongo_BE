import { FileStorageModule } from '@/infrastructure/integrations/storage/file-storage.module'
import { Module } from '@nestjs/common'
import { UploadController } from './upload.controller'
import { UploadService } from './upload.service'

@Module({
  imports: [FileStorageModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService] // Export để vocabulary module có thể sử dụng
})
export class UploadModule {}
