import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateNotificationBodyType,
  NotificationType,
  USER_SEASON_HISTORY_FIELDS,
  UpdateNotificationBodyType
} from './entities/notification.entity'

@Injectable()
export class NotificationRepo {
  constructor(private prismaService: PrismaService) {}
  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }
  create(
    {
      createdById,
      data
    }: {
      createdById: number
      data: CreateNotificationBodyType & { userId: number }
    },
    prismaTx?: PrismaClient
  ): Promise<NotificationType> {
    const client = prismaTx || this.prismaService
    return client.notification.create({
      data: {
        ...data,
        userId: data.userId || createdById
      }
    })
  }

  update(
    {
      id,
      data,
      updatedById
    }: {
      id: number
      data: UpdateNotificationBodyType
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<NotificationType> {
    const client = prismaTx || this.prismaService
    return client.notification.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...data
      }
    })
  }

  delete(
    id: number,
    isHard?: boolean,
    prismaTx?: PrismaClient
  ): Promise<NotificationType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.notification.delete({
          where: { id }
        })
      : client.notification.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date()
          }
        })
  }

  async list(pagination: PaginationQueryType) {
    const { where, orderBy } = parseQs(pagination.qs, USER_SEASON_HISTORY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.notification.count({
        where: filterWhere
      }),
      this.prismaService.notification.findMany({
        where: filterWhere,

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

  async getUserSubWithSubPlan(
    pagination: PaginationQueryType,
    userId: number,
    langId?: number
  ) {
    const { where, orderBy } = parseQs(pagination.qs, USER_SEASON_HISTORY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere: any = {
      deletedAt: null,
      userId,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.notification.count({ where: filterWhere }),
      this.prismaService.notification.findMany({
        where: filterWhere,
        include: {},
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

  findById(id: number): Promise<NotificationType | null> {
    return this.prismaService.notification.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }
}
