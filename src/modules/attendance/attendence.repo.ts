import { PaginationQuery } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaService } from '@/shared/services/prisma.service'
import { CreateAttendanceBody, UpdateAttendanceBody } from './dto/attendance.zod-dto'
import { ATTENDANCE_FIELDS, Attendance } from './entities/attendance.entity'

@Injectable()
export class AttendanceRepo {
  constructor(private prismaService: PrismaService) {}

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreateAttendanceBody
  }): Promise<Attendance> {
    return this.prismaService.attendance.create({
      data: {
        ...data,
        createdById,
        deletedAt: null
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
    data: UpdateAttendanceBody
  }): Promise<Attendance> {
    return this.prismaService.attendance.update({
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
  ): Promise<Attendance> {
    return isHard
      ? this.prismaService.attendance.delete({
          where: {
            id
          }
        })
      : this.prismaService.attendance.update({
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
    const { where, orderBy } = parseQs(pagination.qs, ATTENDANCE_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.attendance.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.attendance.findMany({
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

  findById(id: number): Promise<Attendance | null> {
    return this.prismaService.attendance.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findStreakWithStartEndDay(
    userId: number,
    startOfWeek: Date,
    endOfWeek: Date
  ): Promise<Attendance[]> {
    return this.prismaService.attendance.findMany({
      where: {
        userId,
        date: {
          gte: startOfWeek,
          lte: endOfWeek
        },
        deletedAt: null
      },
      orderBy: { date: 'desc' }
    })
  }

  findByUserIdAndDate(userId: number, date: Date): Promise<Attendance | null> {
    return this.prismaService.attendance.findFirst({
      where: {
        userId,
        date
      }
    })
  }

  findByUserId(userId: number): Promise<Attendance[]> {
    return this.prismaService.attendance.findMany({
      where: {
        userId,
        deletedAt: null
      },
      orderBy: { date: 'desc' }
    })
  }
}
