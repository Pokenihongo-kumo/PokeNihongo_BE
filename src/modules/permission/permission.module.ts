import { Module } from '@nestjs/common'
import { PermissionController } from '@/modules/permission/permission.controller'
import { PermissionRepo } from '@/modules/permission/permission.repo'
import { PermissionService } from '@/modules/permission/permission.service'

@Module({
  providers: [PermissionService, PermissionRepo],
  controllers: [PermissionController],
  exports: [PermissionService, PermissionRepo]
})
export class PermissionModule {}
