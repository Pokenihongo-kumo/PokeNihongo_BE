import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaService } from '@/shared/services/prisma.service'
import {
  CreateUserDailyRequestBody,
  UpdateUserDailyRequestBody
} from './dto/user-daily-request.zod-dto'
import {
  USER_DAILY_REQUEST_FIELDS,
  UserDailyRequest,
  UserDailyRequestDetail
} from './entities/user-daily-request.entity'

@Injectable()
export class UserDailyRequestRepo {
  constructor(private prismaService: PrismaService) {}

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreateUserDailyRequestBody & {
      date: Date
      progress: number
      isCompleted?: boolean
      completedAt?: Date | null
    }
  }): Promise<UserDailyRequest> {
    return this.prismaService.userDailyRequest.create({
      data: {
        ...data,
        createdById,
        isCompleted: data.isCompleted ?? false,
        completedAt: data.completedAt ?? null
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
    data: UpdateUserDailyRequestBody
  }): Promise<UserDailyRequest> {
    return this.prismaService.userDailyRequest.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...data,
        updatedById,
        completedAt: data.isCompleted ? new Date() : null
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
  ): Promise<UserDailyRequest> {
    return isHard
      ? this.prismaService.userDailyRequest.delete({
          where: {
            id
          }
        })
      : this.prismaService.userDailyRequest.update({
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

  async list(pagination: PaginationQuery) {
    const { where, orderBy } = parseQs(pagination.qs, USER_DAILY_REQUEST_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.userDailyRequest.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.userDailyRequest.findMany({
        where: { deletedAt: null, ...where },
        include: {
          dailyRequest: true,
          user: true
        },
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

  findById(id: number): Promise<UserDailyRequest | null> {
    return this.prismaService.userDailyRequest.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        dailyRequest: true,
        user: true
      }
    })
  }

  findByUserIdDateDailyId(
    userId: number,
    date: Date,
    dailyRequestId: number
  ): Promise<UserDailyRequest | null> {
    return this.prismaService.userDailyRequest.findFirst({
      where: {
        userId,
        date,
        dailyRequestId,
        deletedAt: null
      }
    })
  }

  // Lấy user daily requests theo userId và date
  async findByUserAndDate(userId: number, date: Date): Promise<UserDailyRequest[]> {
    return this.prismaService.userDailyRequest.findMany({
      where: {
        userId,
        date,
        deletedAt: null
      },
      orderBy: {
        id: 'asc'
      }
    })
  }

  // Lấy user daily requests với chi tiết daily request và user
  async findByUserAndDateWithDetails(
    userId: number,
    date: Date,
    langId: number
  ): Promise<UserDailyRequestDetail[]> {
    const results = await this.prismaService.userDailyRequest.findMany({
      where: {
        userId,
        date,
        deletedAt: null
      },
      include: {
        dailyRequest: {
          include: {
            reward: true,
            nameTranslations: {
              where: {
                languageId: langId
              },
              select: {
                value: true
              }
            },
            descriptionTranslations: {
              where: {
                languageId: langId
              },
              select: {
                value: true
              }
            }
          }
        },
        user: true
      },
      orderBy: {
        isCompleted: 'asc'
      }
    })

    // Map to include nameTranslation and descriptionTranslation
    return results.map((item) => {
      const dr = item.dailyRequest as any
      const { nameTranslations, descriptionTranslations, ...dailyRequestRest } = dr

      return {
        ...item,
        dailyRequest: {
          ...dailyRequestRest,
          nameTranslation: nameTranslations?.[0]?.value ?? dr.nameKey,
          descriptionTranslation:
            descriptionTranslations?.[0]?.value ?? dr.descriptionKey,
          reward: dr.reward
            ? {
                ...dr.reward,
                nameKey: dr.reward.name
              }
            : null
        }
      } as any
    }) as any
  }
}
