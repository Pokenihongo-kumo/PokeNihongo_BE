import { Module } from '@nestjs/common'
import { RoleController } from '@/modules/role/role.controller'
import { RoleRepo } from '@/modules/role/role.repo'
import { RoleService } from '@/modules/role/role.service'
import { RoleCoreRepo } from './role-core.repo'
import { PermissionModule } from '../permission/permission.module'

@Module({
  imports: [PermissionModule],
  providers: [RoleService, RoleRepo, RoleCoreRepo],
  controllers: [RoleController],
  exports: [RoleService]
})
export class RoleModule {}
