import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import {
  CreateRoleBody,
  ROLE_FIELDS,
  RoleWithPermissions,
  UpdateRoleBody
} from '@/modules/role/role.model'
import { Role } from '@/shared/models/shared-role.model'
import { PrismaService } from '@/shared/services/prisma.service'

@Injectable()
export class RoleRepo {
  constructor(private prismaService: PrismaService) {}

  async list(pagination: PaginationQuery) {
    const { where, orderBy } = parseQs(pagination.qs, ROLE_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.role.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.role.findMany({
        where: { deletedAt: null, ...where },
        orderBy,
        skip,
        take
      })
    ])

    return {
      results: data,
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }

  findById(id: number): Promise<RoleWithPermissions | null> {
    return this.prismaService.role.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        permissions: {
          where: {
            deletedAt: null
          },
          orderBy: {
            module: 'asc'
          }
        }
      }
    })
  }

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreateRoleBody
  }): Promise<Role> {
    return this.prismaService.role.create({
      data: {
        ...data,
        createdById
      }
    })
  }

  async update({
    id,
    updatedById,
    data
  }: {
    id: number
    updatedById: number
    data: UpdateRoleBody
  }): Promise<Role> {
    // Kiểm tra nếu có bất cứ permissionId nào mà đã soft delete thì không cho phép cập nhật
    if (Array.isArray(data.permissionIds) && data.permissionIds.length > 0) {
      const permissions = await this.prismaService.permission.findMany({
        where: {
          id: {
            in: data.permissionIds
          }
        }
      })
      const deletedPermission = permissions.filter((permission) => permission.deletedAt)
      if (deletedPermission.length > 0) {
        const deletedIds = deletedPermission.map((permission) => permission.id).join(', ')
        throw new Error(`Permission with id has been deleted: ${deletedIds}`)
      }
    }

    return this.prismaService.role.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        permissions: Array.isArray(data.permissionIds)
          ? { set: data.permissionIds.map((id) => ({ id })) }
          : undefined,
        updatedById
      },
      include: {
        permissions: {
          where: {
            deletedAt: null
          }
        }
      }
    })
  }

  delete(
    {
      id,
      deletedById
    }: {
      id: number
      deletedById: number
    },
    isHard?: boolean
  ): Promise<Role> {
    return isHard
      ? this.prismaService.role.delete({
          where: {
            id
          }
        })
      : this.prismaService.role.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date(),
            deletedById
          }
        })
  }
}
