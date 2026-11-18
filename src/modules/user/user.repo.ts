import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { PaginationResponseType } from '@/shared/models/response.model'
import { Injectable } from '@nestjs/common'
import { UserStatus } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateUserBodyType,
  UpdateUserBodyType,
  USER_FIELDS,
  UserType,
  UserWithoutPasswordSchema,
  UserWithoutPasswordType
} from './entities/user.entity'

@Injectable()
export class UserRepo {
  constructor(private prismaService: PrismaService) {}

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreateUserBodyType & { password: string; status: UserStatus }
  }): Promise<UserType> {
    return this.prismaService.user.create({
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
    data: UpdateUserBodyType
  }): Promise<UserType> {
    return this.prismaService.user.update({
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
  ): Promise<UserType> {
    return isHard
      ? this.prismaService.user.delete({
          where: {
            id
          }
        })
      : this.prismaService.user.update({
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

  async list(
    pagination: PaginationQueryType
  ): Promise<PaginationResponseType<UserWithoutPasswordType>> {
    const { where, orderBy } = parseQs(pagination.qs, USER_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.user.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.user.findMany({
        where: { deletedAt: null, ...where },

        include: {
          role: true,
          level: true
        },
        orderBy: orderBy,
        skip,
        take
      })
    ])

    return {
      results: data.map((user) => UserWithoutPasswordSchema.parse(user)),
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }

  findById(id: number): Promise<UserType | null> {
    return this.prismaService.user.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        role: true,
        level: true
      }
    })
  }

  findByEmail(email: string): Promise<UserType | null> {
    return this.prismaService.user.findUnique({
      where: {
        email,
        deletedAt: null
      },
      include: {
        role: true,
        level: true
      }
    })
  }

  async incrementFreeCoins(userId: number, amount: number): Promise<UserType> {
    return this.prismaService.user.update({
      where: {
        id: userId,
        deletedAt: null
      },
      data: {
        freeCoins: {
          increment: amount
        }
      }
    })
  }

  // The deletion job: hard delete only while still inactive (reactivated or
  // already deleted users are kept)
  deleteIfStillInactive(userId: number) {
    return this.prismaService.user.deleteMany({
      where: { id: userId, status: 'INACTIVE', deletedAt: null }
    })
  }
}
