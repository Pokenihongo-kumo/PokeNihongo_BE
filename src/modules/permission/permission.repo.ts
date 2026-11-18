import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import {
  CreatePermissionBody,
  PERMISSION_FIELDS,
  Permission,
  UpdatePermissionBody
} from 'src/modules/permission/permission.model'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class PermissionRepo {
  constructor(private prismaService: PrismaService) {}

  async list(pagination: PaginationQuery) {
    pagination.pageSize = 10000
    const { where, orderBy } = parseQs(pagination.qs, PERMISSION_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.permission.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.permission.findMany({
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

  findById(id: number): Promise<Permission | null> {
    return this.prismaService.permission.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreatePermissionBody
  }): Promise<Permission> {
    return this.prismaService.permission.create({
      data: {
        ...data,
        createdById
      }
    })
  }

  update({
    id,
    updatedById,
    data
  }: {
    id: number
    updatedById: number
    data: UpdatePermissionBody
  }): Promise<Permission> {
    return this.prismaService.permission.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...data,
        updatedById
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
  ): Promise<Permission> {
    return isHard
      ? this.prismaService.permission.delete({
          where: {
            id
          }
        })
      : this.prismaService.permission.update({
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
