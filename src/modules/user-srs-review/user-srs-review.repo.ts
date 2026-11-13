import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { Prisma, SrsContentType } from '@prisma/client'

const byContent = (userId: number, contentType: SrsContentType, contentId: number) => ({
  userId_contentType_contentId: { userId, contentType, contentId }
})

@Injectable()
export class SrsReviewRepo {
  constructor(private readonly prisma: PrismaService) {}

  list(where: Prisma.UserSrsReviewWhereInput, take = 200) {
    return this.prisma.userSrsReview.findMany({
      where,
      orderBy: { nextReviewDate: 'asc' },
      take
    })
  }

  findUnique(userId: number, contentType: SrsContentType, contentId: number) {
    return this.prisma.userSrsReview.findUnique({
      where: byContent(userId, contentType, contentId)
    })
  }

  upsert(
    userId: number,
    contentType: SrsContentType,
    contentId: number,
    message?: string
  ) {
    return this.prisma.userSrsReview.upsert({
      where: byContent(userId, contentType, contentId),
      update: { message: message ?? undefined },
      create: {
        userId,
        contentType,
        contentId,
        message: message || '',
        nextReviewDate: new Date()
      }
    })
  }

  update(
    userId: number,
    contentType: SrsContentType,
    contentId: number,
    data: Prisma.UserSrsReviewUpdateInput
  ) {
    return this.prisma.userSrsReview.update({
      where: byContent(userId, contentType, contentId),
      data
    })
  }

  // Unread reviews due in [start, end]: leeches and long wrong streaks first
  async listForDate(
    userId: number,
    options: { skip: number; take: number; start: Date; end: Date }
  ) {
    const where: Prisma.UserSrsReviewWhereInput = {
      userId,
      nextReviewDate: { gte: options.start, lte: options.end },
      isRead: false
    }
    const [rows, total] = await Promise.all([
      this.prisma.userSrsReview.findMany({
        where,
        orderBy: [
          { isLeech: 'desc' },
          { incorrectStreak: 'desc' },
          { nextReviewDate: 'asc' }
        ],
        skip: options.skip,
        take: options.take
      }),
      this.prisma.userSrsReview.count({ where })
    ])
    return { rows, total }
  }

  findById(id: number) {
    return this.prisma.userSrsReview.findUnique({ where: { id } })
  }

  updateById(id: number, data: Prisma.UserSrsReviewUpdateInput) {
    return this.prisma.userSrsReview.update({ where: { id }, data })
  }
}
