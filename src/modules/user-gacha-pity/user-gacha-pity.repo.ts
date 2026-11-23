import { GachaPityTypeType } from '@/common/constants/gacha.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  CreateUserGachaPityBody,
  UpdateUserGachaPityBody
} from './dto/user-gacha-pity.zod-dto'
import { USER_GACHA_PITY_FIELDS, UserGachaPity } from './entities/user-gacha-pityentity'

@Injectable()
export class UserGachaPityRepo {
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
      data: CreateUserGachaPityBody
    },
    prismaTx?: PrismaClient
  ): Promise<UserGachaPity> {
    const client = prismaTx || this.prismaService
    return client.userGachaPity.create({
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
      data: UpdateUserGachaPityBody
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<UserGachaPity> {
    const client = prismaTx || this.prismaService
    return client.userGachaPity.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...data
      }
    })
  }

  delete(id: number, isHard?: boolean, prismaTx?: PrismaClient): Promise<UserGachaPity> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.userGachaPity.delete({
          where: { id }
        })
      : client.userGachaPity.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date()
          }
        })
  }

  async list(pagination: PaginationQuery) {
    const { where, orderBy } = parseQs(pagination.qs, USER_GACHA_PITY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.userGachaPity.count({
        where: filterWhere
      }),
      this.prismaService.userGachaPity.findMany({
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

  findById(id: number): Promise<UserGachaPity | null> {
    return this.prismaService.userGachaPity.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findStatusByUserId(
    userId: number,
    status: GachaPityTypeType,
    prismaTx?: PrismaClient
  ): Promise<UserGachaPity | null> {
    return (prismaTx || this.prismaService).userGachaPity.findFirst({
      where: {
        userId,
        status,
        deletedAt: null
      }
    })
  }
}
