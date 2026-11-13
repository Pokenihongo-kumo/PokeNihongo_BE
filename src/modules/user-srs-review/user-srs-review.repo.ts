import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'

@Injectable()
export class SrsReviewRepo {
  constructor(private readonly prisma: PrismaService) {}

  async list(where: any, take = 200) {
    return (this.prisma as any).userSrsReview.findMany({
      where,
      orderBy: { nextReviewDate: 'asc' },
      take
    })
  }

  async findUnique(userId: number, contentType: string, contentId: number) {
    return (this.prisma as any).userSrsReview.findUnique({
      where: {
        userId_contentType_contentId: { userId, contentType, contentId }
      }
    })
  }

  async upsert(userId: number, contentType: string, contentId: number, message?: string) {
    return (this.prisma as any).userSrsReview.upsert({
      where: {
        userId_contentType_contentId: { userId, contentType, contentId }
      },
      update: { message: message ?? undefined },
      create: { userId, contentType, contentId, message: message || '' }
    })
  }

  async update(userId: number, contentType: string, contentId: number, data: any) {
    return (this.prisma as any).userSrsReview.update({
      where: {
        userId_contentType_contentId: { userId, contentType, contentId }
      },
      data
    })
  }

  async listForDate(
    userId: number,
    date: Date,
    options?: { skip?: number; take?: number; start?: Date; end?: Date }
  ) {
    let start = options?.start ?? null
    let end = options?.end ?? null
    if (!start || !end) {
      start = new Date(date)
      start.setHours(0, 0, 0, 0)
      end = new Date(date)
      end.setHours(23, 59, 59, 999)
    }
    const where = {
      userId,
      nextReviewDate: { gte: start, lte: end },
      // Chỉ lấy các SRS chưa được đánh dấu đã đọc
      isRead: false
    }
    const skip = options?.skip ?? 0
    const take = options?.take
    const [rows, total] = await Promise.all([
      (this.prisma as any).userSrsReview.findMany({
        where,
        orderBy: [
          { isLeech: 'desc' },
          { incorrectStreak: 'desc' },
          { nextReviewDate: 'asc' }
        ],
        skip,
        take
      }),
      (this.prisma as any).userSrsReview.count({ where })
    ])
    return { rows, total }
  }

  async findById(id: number) {
    return (this.prisma as any).userSrsReview.findUnique({ where: { id } })
  }

  async updateById(id: number, data: any) {
    return (this.prisma as any).userSrsReview.update({ where: { id }, data })
  }
}
