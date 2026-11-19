import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PermissionAlreadyExistsException } from 'src/modules/permission/permission.error'
import {
  CreatePermissionBody,
  UpdatePermissionBody
} from 'src/modules/permission/permission.model'
import { PermissionRepo } from 'src/modules/permission/permission.repo'
import { NotFoundRecordException } from 'src/shared/error'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from 'src/shared/helpers'

@Injectable()
export class PermissionService {
  constructor(private permissionRepo: PermissionRepo) {}

  async list(pagination: PaginationQuery) {
    const data = await this.permissionRepo.list(pagination)
    return data
  }

  async findById(id: number) {
    const permission = await this.permissionRepo.findById(id)
    if (!permission) {
      throw new NotFoundRecordException()
    }
    return permission
  }

  async create({
    data,
    createdById
  }: {
    data: CreatePermissionBody
    createdById: number
  }) {
    try {
      const result = await this.permissionRepo.create({
        createdById,
        data
      })
      return result
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new PermissionAlreadyExistsException()
      }
      throw error
    }
  }

  async update({
    id,
    data,
    updatedById
  }: {
    id: number
    data: UpdatePermissionBody
    updatedById: number
  }) {
    try {
      const permission = await this.permissionRepo.update({
        id,
        updatedById,
        data
      })
      return permission
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new PermissionAlreadyExistsException()
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      await this.permissionRepo.delete({
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

  // ---- For other modules (module-boundary plan B8) ----
  // Same arguments and results as the repo methods.

  // The repo's list (the service's own list answers the HTTP route)
  listPermissionRows(...args: Parameters<PermissionRepo['list']>) {
    return this.permissionRepo.list(...args)
  }
}
