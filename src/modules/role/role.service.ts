import { RoleName } from '@/common/constants/role.constant'
import { PermissionService } from '@/modules/permission/permission.service'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import {
  ProhibitedActionOnBaseRoleException,
  RoleAlreadyExistsException
} from '@/modules/role/role.error'
import { CreateRoleBody, UpdateRoleBody } from '@/modules/role/role.model'
import { RoleRepo } from '@/modules/role/role.repo'
import { NotFoundRecordException } from '@/shared/error'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { RoleCoreRepo } from './role-core.repo'

@Injectable()
export class RoleService {
  constructor(
    private roleRepo: RoleRepo,
    private permissionService: PermissionService,
    private roleCoreRepo: RoleCoreRepo
  ) {}

  async list(pagination: PaginationQuery) {
    const data = await this.roleRepo.list(pagination)
    return data
  }

  async findById(id: number, query: PaginationQuery) {
    const role = await this.roleRepo.findById(id)
    if (!role) {
      throw new NotFoundRecordException()
    }

    // 1) Fetch permissions with pagination/filter from query
    const permissionsResult = await this.permissionService.listPermissionRows(query)
    const permissions = permissionsResult.results

    // 2) Build a set of permission identifiers that this role has
    const rolePermissionsArray = Array.isArray((role as any).permissions)
      ? (role as any).permissions
      : []
    const rolePermissionIds = new Set(
      rolePermissionsArray.map((p: any) => p.id ?? p.name)
    )

    // 3) Add hasPermission flag to each permission in the filtered list
    const permissionsWithFlag = permissions.map((perm: any) => ({
      ...perm,
      hasPermission: rolePermissionIds.has(perm.id ?? perm.name)
    }))

    // 4) Remove permissions from role object
    const { permissions: _, ...roleWithoutPermissions } = role as any

    return {
      // role: roleWithoutPermissions,
      permissions: permissionsWithFlag
    }
  }

  async create({ data, createdById }: { data: CreateRoleBody; createdById: number }) {
    try {
      const role = await this.roleRepo.create({
        createdById,
        data
      })
      return role
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new RoleAlreadyExistsException()
      }
      throw error
    }
  }

  /**
   * Kiểm tra xem role có phải là 1 trong 3 role cơ bản không
   */
  private async verifyRole(roleId: number) {
    const role = await this.roleRepo.findById(roleId)
    if (!role) {
      throw NotFoundRecordException
    }
    const baseRoles: string[] = [RoleName.Admin]

    if (baseRoles.includes(role.name)) {
      throw new ProhibitedActionOnBaseRoleException()
    }
  }

  async update({
    id,
    data,
    updatedById
  }: {
    id: number
    data: UpdateRoleBody
    updatedById: number
  }) {
    try {
      const updatedRole = await this.roleRepo.update({
        id,
        updatedById,
        data
      })
      return updatedRole
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new RoleAlreadyExistsException()
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      await this.verifyRole(id)
      await this.roleRepo.delete({
        id,
        deletedById
      })
      return
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  // ---- For other modules (module-boundary plan B2) ----
  // Same results as the former shared role repo (ids cached after first read)

  getAdminRoleId() {
    return this.roleCoreRepo.getAdminRoleId()
  }

  getCustomerRoleId() {
    return this.roleCoreRepo.getCustomerRoleId()
  }

  getRoleById(roleId: number) {
    return this.roleCoreRepo.getRoleById(roleId)
  }

  findActiveRoleWithPermission(
    ...args: Parameters<RoleCoreRepo['findActiveRoleWithPermission']>
  ) {
    return this.roleCoreRepo.findActiveRoleWithPermission(...args)
  }
}
