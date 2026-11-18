import { RoleName } from '@/common/constants/role.constant'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { I18nService } from 'src/i18n/i18n.service'
import { RoleMessage } from 'src/i18n/message-keys'
import { PermissionRepo } from 'src/modules/permission/permission.repo'
import {
  ProhibitedActionOnBaseRoleException,
  RoleAlreadyExistsException
} from 'src/modules/role/role.error'
import { CreateRoleBodyType, UpdateRoleBodyType } from 'src/modules/role/role.model'
import { RoleRepo } from 'src/modules/role/role.repo'
import { RoleCoreRepo } from './role-core.repo'
import { NotFoundRecordException } from 'src/shared/error'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from 'src/shared/helpers'

@Injectable()
export class RoleService {
  constructor(
    private roleRepo: RoleRepo,
    private permissionRepo: PermissionRepo,
    private i18nService: I18nService,
    private roleCoreRepo: RoleCoreRepo
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.roleRepo.list(pagination)
    return {
      data,
      message: this.i18nService.translate(RoleMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, query: PaginationQueryType, lang: string = 'vi') {
    const role = await this.roleRepo.findById(id)
    if (!role) {
      throw new NotFoundRecordException()
    }

    // 1) Fetch permissions with pagination/filter from query
    const permissionsResult = await this.permissionRepo.list(query)
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
      statusCode: 200,
      data: {
        // role: roleWithoutPermissions,
        permissions: permissionsWithFlag
      },
      message: this.i18nService.translate(RoleMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    { data, createdById }: { data: CreateRoleBodyType; createdById: number },
    lang: string = 'vi'
  ) {
    try {
      const role = await this.roleRepo.create({
        createdById,
        data
      })
      return {
        data: role,
        message: this.i18nService.translate(RoleMessage.CREATE_SUCCESS, lang)
      }
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

  async update(
    {
      id,
      data,
      updatedById
    }: {
      id: number
      data: UpdateRoleBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const updatedRole = await this.roleRepo.update({
        id,
        updatedById,
        data
      })
      return {
        data: updatedRole,
        message: this.i18nService.translate(RoleMessage.UPDATE_SUCCESS, lang)
      }
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

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.verifyRole(id)
      await this.roleRepo.delete({
        id,
        deletedById
      })
      return {
        data: null,
        message: this.i18nService.translate(RoleMessage.DELETE_SUCCESS, lang)
      }
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
